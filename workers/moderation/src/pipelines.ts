import { and, eq, inArray, sql } from 'drizzle-orm'
import {
  caseStudies,
  issues,
  sdgs,
  tags,
  issueTags,
  issueSdgs,
  type LocationScale,
  type GeoJsonGeometry,
} from '../../../server/database/schema'
import {
  type Ctx,
  embed,
  findSimilar,
  createAuditLog,
  updateUserTrustScore,
  checkAndApplyBan,
} from './lib'
import { STEPS, runAgent } from './steps'
import { createGeocodeTool, bboxToPolygon } from './geocode'
import { areaSimplifyTolerance, simplifyAreaGeometry } from '../../../server/utils/simplify-geo'

const DUPLICATE_THRESHOLD = 0.92
// Case studies sit under a single solution and are thematically close by
// construction, so a true duplicate (the same deployment re-created) scores very
// high (~0.95+) while genuinely distinct deployments of the same intervention
// stay well below. A slightly stricter bar than issues keeps false positives down.
export const CASE_STUDY_DUPLICATE_THRESHOLD = 0.93
const CONFIDENCE_THRESHOLD = 0.7

interface IssueRef {
  id: number
  type: 'issue' | 'solution'
  parentId: number | null
  authorId: string | null
}
interface SimilarIssue {
  id: number
  title: string
  summary: string
  similarity: number
}
interface SimilarCaseStudy {
  id: number
  locationName: string | null
  similarity: number
}
interface RefItem {
  id: number
  name: string
}

export interface IssuePrep {
  issue: IssueRef
  title: string
  summary: string
  description: string | null
  locationName: string | null
  scale: LocationScale | null
  location: { x: number; y: number } | null
  issueText: string
  duplicateContext: string
  tagList: string
  sdgList: string
  similar: SimilarIssue[]
  embedding: number[] | null
  allTags: RefItem[]
  allSdgs: RefItem[]
}

export interface ModerationResult {
  approved: boolean
  reason: string
  isSpam: boolean
  duplicateOfId?: number | null
  confidence: number
  questions?: string[] | null
}
export interface TagResult {
  existingTagIds: number[]
  newTagNames: string[]
}
export interface SdgResult {
  sdgIds: number[]
}

export async function prepareIssue(ctx: Ctx, issueId: number): Promise<IssuePrep | null> {
  const { db } = ctx
  const issue = await db.query.issues.findFirst({ where: eq(issues.id, issueId) })
  if (!issue) {
    console.error(`[review-issue] Issue ${issueId} not found`)
    return null
  }
  if (issue.status !== 'pending') return null

  const issueText = [
    `Title: ${issue.title}`,
    `Summary: ${issue.summary}`,
    issue.description ? `Description: ${issue.description}` : '',
    issue.infoRequest && issue.infoResponse
      ? `\n--- Additional context (author responded to reviewer questions) ---\nQuestions asked: ${issue.infoRequest}\nAuthor response: ${issue.infoResponse}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  let embedding: number[] | null = null
  try {
    embedding = await embed(ctx.openai, `${issue.title}\n${issue.summary}`)
  } catch (err) {
    console.error(`[review-issue] Embedding generation failed for issue ${issueId}:`, err)
  }

  let similar: SimilarIssue[] = []
  if (embedding) {
    similar = await findSimilar<SimilarIssue>(db, {
      table: 'issues',
      columns: 'id, title, summary',
      embedding,
      where: sql`status = 'approved' AND id <> ${issueId} AND type = ${issue.type}${issue.parentId ? sql` AND parent_id = ${issue.parentId}` : sql``}`,
      limit: 5,
      threshold: 0.75,
    })
  }

  const [allTags, allSdgs] = await Promise.all([
    db.select({ id: tags.id, name: tags.name }).from(tags),
    db.select({ id: sdgs.id, name: sdgs.name }).from(sdgs),
  ])

  const duplicateContext =
    similar.length > 0
      ? `\n\nExisting similar issues (high similarity may indicate a duplicate):\n${similar.map((s) => `- [id:${s.id}, similarity:${(s.similarity * 100).toFixed(0)}%] "${s.title}" — ${s.summary}`).join('\n')}`
      : ''

  return {
    issue: { id: issue.id, type: issue.type, parentId: issue.parentId, authorId: issue.authorId },
    title: issue.title,
    summary: issue.summary,
    description: issue.description,
    locationName: issue.locationName,
    scale: issue.scale,
    location: issue.location as { x: number; y: number } | null,
    issueText,
    duplicateContext,
    tagList: allTags.map((t) => `- id:${t.id} "${t.name}"`).join('\n'),
    sdgList: allSdgs.map((s) => `- id:${s.id} "${s.name}"`).join('\n'),
    similar,
    embedding,
    allTags,
    allSdgs,
  }
}

export async function finalizeIssue(
  ctx: Ctx,
  prep: IssuePrep,
  moderation: ModerationResult,
  tagResult: TagResult,
  sdgResult: SdgResult,
): Promise<{ approved: boolean }> {
  const { db } = ctx
  const { issue, similar, embedding } = prep
  const issueId = issue.id
  const promptVersion = STEPS['issue.moderate'].version

  const nearDuplicate = similar.find((s) => s.similarity >= DUPLICATE_THRESHOLD)
  if (nearDuplicate && moderation.approved) {
    moderation.approved = false
    moderation.reason = `Near-duplicate of existing issue #${nearDuplicate.id} (${(nearDuplicate.similarity * 100).toFixed(0)}% similarity)`
    moderation.duplicateOfId = nearDuplicate.id
    moderation.confidence = 0.95
  }

  const confidence = moderation.confidence ?? 1
  if (confidence < CONFIDENCE_THRESHOLD && !moderation.isSpam) {
    const questions = moderation.questions?.filter(Boolean) ?? []
    if (questions.length > 0) {
      await db
        .update(issues)
        .set({ infoRequest: questions.join('\n'), infoRequestedAt: new Date() })
        .where(eq(issues.id, issueId))
    }
    await createAuditLog(db, {
      type: 'moderation',
      action: 'flag_uncertain',
      status: 'needs_review',
      issueId,
      userId: issue.authorId,
      reason: moderation.reason,
      details: {
        confidence,
        aiDecision: moderation.approved ? 'approve' : 'reject',
        questions,
        similarIssues: similar.slice(0, 3).map((s) => ({ id: s.id, similarity: s.similarity })),
        promptVersion,
      },
    })
    console.log(
      `[review-issue] Issue ${issueId} flagged as uncertain (confidence: ${confidence}). Awaiting review.`,
    )
    return { approved: false }
  }

  if (!moderation.approved) {
    if (issue.parentId) {
      const counter =
        issue.type === 'solution'
          ? { solutionCount: sql`GREATEST(${issues.solutionCount} - 1, 0)` }
          : { subIssueCount: sql`GREATEST(${issues.subIssueCount} - 1, 0)` }
      await db.update(issues).set(counter).where(eq(issues.id, issue.parentId))
    }
    await db
      .update(issues)
      .set({
        status: 'rejected',
        rejectionReason: moderation.reason,
        rejectedAt: new Date(),
        isSpam: moderation.isSpam ?? false,
      })
      .where(eq(issues.id, issueId))
    let action: 'flag_spam' | 'flag_duplicate' | 'reject' = 'reject'
    if (moderation.isSpam) action = 'flag_spam'
    else if (moderation.duplicateOfId) action = 'flag_duplicate'

    await createAuditLog(db, {
      type: 'moderation',
      action,
      issueId,
      userId: issue.authorId,
      reason: moderation.reason,
      details: {
        confidence,
        duplicateOfId: moderation.duplicateOfId ?? null,
        isSpam: moderation.isSpam,
        similarIssues: similar.slice(0, 3).map((s) => ({ id: s.id, similarity: s.similarity })),
        promptVersion,
      },
    })
    if (issue.authorId) {
      await checkAndApplyBan(db, issue.authorId)
      await updateUserTrustScore(ctx, issue.authorId)
    }
    return { approved: false }
  }

  const newTagIds: number[] = []
  for (const name of tagResult.newTagNames ?? []) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const [newTag] = await db
      .insert(tags)
      .values({ name, slug })
      .onConflictDoNothing({ target: tags.slug })
      .returning()
    if (newTag) {
      newTagIds.push(newTag.id)
    } else {
      const existing = await db.query.tags.findFirst({ where: eq(tags.slug, slug) })
      if (existing) newTagIds.push(existing.id)
    }
  }

  const allTagIds = [...(tagResult.existingTagIds ?? []), ...newTagIds]
  const validTagIds = Array.from(
    new Set(
      allTagIds.filter((id) => prep.allTags.some((t) => t.id === id) || newTagIds.includes(id)),
    ),
  )
  const validSdgIds = Array.from(
    new Set((sdgResult.sdgIds ?? []).filter((id) => prep.allSdgs.some((s) => s.id === id))),
  )

  await db.transaction(async (tx) => {
    await tx
      .update(issues)
      .set({ status: 'approved', ...(embedding ? { embedding } : {}) })
      .where(eq(issues.id, issueId))
    if (validTagIds.length)
      await tx.insert(issueTags).values(validTagIds.map((tagId) => ({ issueId, tagId })))
    if (validSdgIds.length)
      await tx.insert(issueSdgs).values(validSdgIds.map((sdgId) => ({ issueId, sdgId })))
  })

  await createAuditLog(db, {
    type: 'moderation',
    action: 'approve',
    issueId,
    userId: issue.authorId,
    reason: moderation.reason,
    details: {
      confidence,
      tags: validTagIds,
      sdgs: validSdgIds,
      newTags: tagResult.newTagNames,
      promptVersion,
    },
  })
  if (issue.authorId) await updateUserTrustScore(ctx, issue.authorId)

  return { approved: true }
}

export interface StructurePrep {
  issue: IssueRef
  issueText: string
  contextLines: string
}
export interface StructureVerdict {
  action: 'none' | 'duplicate' | 'reparent' | 'convert_to_case_study'
  targetId: number | null
  reason: string
}

export async function prepareStructure(ctx: Ctx, issueId: number): Promise<StructurePrep | null> {
  const { db } = ctx
  const issue = await db.query.issues.findFirst({ where: eq(issues.id, issueId) })
  if (!issue || issue.status !== 'approved' || !issue.embedding) return null

  const issueText = [
    `[${issue.type}] Title: ${issue.title}`,
    `Summary: ${issue.summary}`,
    issue.description ? `Description: ${issue.description}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const similar = await findSimilar<{
    id: number
    type: string
    title: string
    summary: string
    parentId: number | null
    similarity: number
  }>(db, {
    table: 'issues',
    columns: 'id, type, title, summary, parent_id AS "parentId"',
    embedding: issue.embedding as number[],
    where: sql`status = 'approved' AND id <> ${issueId}`,
    limit: 10,
    threshold: 0.6,
  })
  if (similar.length === 0) return null

  const parentIds = [...new Set(similar.map((s) => s.parentId).filter(Boolean))] as number[]
  let parents: Array<{ id: number; title: string; type: string }> = []
  if (parentIds.length > 0) {
    parents = await db
      .select({ id: issues.id, title: issues.title, type: issues.type })
      .from(issues)
      .where(and(inArray(issues.id, parentIds), eq(issues.status, 'approved')))
  }

  const contextLines = similar
    .map((s) => {
      const parentLabel = s.parentId
        ? ` (child of #${s.parentId}: "${parents.find((p) => p.id === s.parentId)?.title ?? '?'}")`
        : ' (top-level)'
      return `- #${s.id} [${s.type}] "${s.title}" — ${s.summary} | similarity: ${(s.similarity * 100).toFixed(0)}%${parentLabel}`
    })
    .join('\n')

  return {
    issue: { id: issue.id, type: issue.type, parentId: issue.parentId, authorId: issue.authorId },
    issueText,
    contextLines,
  }
}

async function rejectForStructure(ctx: Ctx, issue: IssueRef, reason: string) {
  const { db } = ctx
  if (issue.parentId) {
    const counter =
      issue.type === 'solution'
        ? { solutionCount: sql`GREATEST(${issues.solutionCount} - 1, 0)` }
        : { subIssueCount: sql`GREATEST(${issues.subIssueCount} - 1, 0)` }
    await db.update(issues).set(counter).where(eq(issues.id, issue.parentId))
  }
  await db
    .update(issues)
    .set({ status: 'rejected', rejectionReason: reason, rejectedAt: new Date() })
    .where(eq(issues.id, issue.id))
}

export async function applyStructure(
  ctx: Ctx,
  prep: StructurePrep,
  verdict: StructureVerdict,
): Promise<void> {
  const { db } = ctx
  const { issue } = prep
  const issueId = issue.id
  if (verdict.action === 'none') return

  const promptVersion = STEPS['structure.verdict'].version
  console.log(
    `[review-structure] ${issue.type} #${issueId}: ${verdict.action} → #${verdict.targetId} — ${verdict.reason}`,
  )

  if (verdict.action === 'duplicate') {
    await rejectForStructure(ctx, issue, `Duplicate of #${verdict.targetId}: ${verdict.reason}`)
    await createAuditLog(db, {
      type: 'structure',
      action: 'flag_duplicate',
      issueId,
      userId: issue.authorId,
      reason: verdict.reason,
      details: { targetId: verdict.targetId, promptVersion },
    })
    return
  }

  if (verdict.action === 'reparent' && verdict.targetId && !issue.parentId) {
    const target = await db.query.issues.findFirst({ where: eq(issues.id, verdict.targetId) })
    if (target && target.status === 'approved' && target.type === 'issue') {
      const counter =
        issue.type === 'solution'
          ? { solutionCount: sql`${issues.solutionCount} + 1` }
          : { subIssueCount: sql`${issues.subIssueCount} + 1` }
      await db.transaction(async (tx) => {
        await tx.update(issues).set({ parentId: verdict.targetId }).where(eq(issues.id, issueId))
        await tx.update(issues).set(counter).where(eq(issues.id, verdict.targetId!))
      })
      await createAuditLog(db, {
        type: 'structure',
        action: 'reparent',
        status: 'needs_review',
        issueId,
        reason: verdict.reason,
        details: { targetId: verdict.targetId, previousParentId: null, promptVersion },
      })
    }
    return
  }

  if (verdict.action === 'convert_to_case_study' && verdict.targetId && issue.type === 'solution') {
    await rejectForStructure(
      ctx,
      issue,
      `This looks like a case study, not a solution. ${verdict.reason} Consider resubmitting as a case study on solution #${verdict.targetId}.`,
    )
    await createAuditLog(db, {
      type: 'structure',
      action: 'convert_to_case_study',
      status: 'needs_review',
      issueId,
      userId: issue.authorId,
      reason: verdict.reason,
      details: { targetId: verdict.targetId, promptVersion },
    })
  }
}

type Metric = {
  label: string
  baseline?: string | null
  result?: string | null
  unit?: string | null
}
type Source = { url: string; title?: string | null }
type LinkRow = { url: string; title?: string | null }
type SolutionRef = { title: string; summary: string } | null
export interface CaseStudyModeration {
  approved: boolean
  reason: string
  isSpam: boolean
  duplicateOfId?: number | null
}
export interface CurationResult {
  description: string | null
  lessonsLearned: string[] | null
  implementer: string | null
  fundingSource: string | null
  cost: string | null
  currency: string | null
  scale: LocationScale | null
  startDate: string | null
  endDate: string | null
  metrics: Metric[] | null
  sources: Source[] | null
  links: LinkRow[] | null
  notes: string
}

type CaseStudyRow = typeof caseStudies.$inferSelect

export interface CaseStudyPrep {
  cs: CaseStudyRow
  solution: SolutionRef
  caseStudyText: string
  parentContext: string
  originalJson: string
  similar: SimilarCaseStudy[]
}

export async function prepareCaseStudy(
  ctx: Ctx,
  caseStudyId: number,
): Promise<CaseStudyPrep | null> {
  const { db } = ctx
  const cs = await db.query.caseStudies.findFirst({ where: eq(caseStudies.id, caseStudyId) })
  if (!cs) {
    console.error(`[review-case-study] Case study ${caseStudyId} not found`)
    return null
  }
  if (cs.status !== 'pending') return null

  const solution =
    (await db.query.issues.findFirst({
      where: eq(issues.id, cs.solutionId),
      columns: { title: true, summary: true },
    })) ?? null

  const caseStudyText = [
    solution ? `Parent solution: ${solution.title}` : '',
    `Location: ${cs.locationName}`,
    `Outcome: ${cs.outcome}`,
    cs.scale ? `Scale: ${cs.scale}` : '',
    cs.implementer ? `Implementer: ${cs.implementer}` : '',
    cs.description ? `Description: ${cs.description}` : '',
    cs.fundingSource ? `Funding source: ${cs.fundingSource}` : '',
    Array.isArray(cs.lessonsLearned) && cs.lessonsLearned.length
      ? `Lessons learned: ${(cs.lessonsLearned as string[]).join('; ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  const original = {
    outcome: cs.outcome,
    locationName: cs.locationName,
    scale: cs.scale,
    description: cs.description,
    implementer: cs.implementer,
    startDate: cs.startDate,
    endDate: cs.endDate,
    metrics: cs.metrics,
    cost: cs.cost,
    currency: cs.currency,
    fundingSource: cs.fundingSource,
    sources: cs.sources,
    lessonsLearned: cs.lessonsLearned,
    links: cs.links,
  }
  const parentContext = [
    solution?.title ? `Parent solution: ${solution.title}` : '',
    solution?.summary ? `Parent summary: ${solution.summary}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  // Duplicate guard: case studies had no dedup, so re-creating the same deployment
  // under a solution slipped straight through (e.g. a seed script run twice).
  // Mirror the issue/solution path — compare this case study's embedding against
  // approved siblings under the SAME solution; finalize rejects a near-duplicate.
  let similar: SimilarCaseStudy[] = []
  const embedding = cs.embedding as number[] | null
  if (embedding) {
    similar = await findSimilar<SimilarCaseStudy>(db, {
      table: 'case_studies',
      columns: 'id, location_name AS "locationName"',
      embedding,
      where: sql`status = 'approved' AND id <> ${cs.id} AND solution_id = ${cs.solutionId}`,
      limit: 5,
      threshold: 0.8,
    })
  }

  return {
    cs,
    solution,
    caseStudyText,
    parentContext,
    originalJson: JSON.stringify(original, null, 2),
    similar,
  }
}

export type LocatedKind = 'issue' | 'case-study'

export interface LocationTarget {
  kind: LocatedKind
  id: number
  locationName: string
  scale: LocationScale | null
  location: { x: number; y: number }
  authorId: string | null
}

export interface LocationVerdict {
  action: 'keep' | 'relocate'
  confidence: number
  reason: string
  latitude: number | null
  longitude: number | null
  area: GeoJsonGeometry | null
  // Corrected location-name text, or null when the stated name is already accurate.
  locationName: string | null
}

interface LocationAgentResult {
  action: 'keep' | 'relocate'
  confidence: number
  reason: string
  chosenPlaceId: number | null
  locationName: string | null
}

const LOCATION_FIX_CONFIDENCE = 0.7
const LOCATION_MIN_SHIFT_DEG = 0.01
const GEOCODE_USER_AGENT = 'CommunityFix-Moderation/1.0 (+https://communityfix.org)'

export async function resolveLocation(
  ctx: Ctx,
  target: LocationTarget,
  document: string,
): Promise<LocationVerdict> {
  const geocode = createGeocodeTool(GEOCODE_USER_AGENT)
  const out = await runAgent<LocationAgentResult>(
    ctx.anthropic,
    'location.resolve',
    {
      locationName: target.locationName,
      scale: target.scale ?? 'unspecified',
      latitude: String(target.location.y),
      longitude: String(target.location.x),
      document,
    },
    [geocode],
    `${target.kind} ${target.id}`,
  )

  // The name correction is independent of the point decision: a "keep" verdict
  // still carries it through so the text can be fixed without moving the point.
  const locationName = out.locationName?.trim() || null
  const keep: LocationVerdict = {
    action: 'keep',
    confidence: out.confidence,
    reason: out.reason,
    latitude: null,
    longitude: null,
    area: null,
    locationName,
  }
  if (out.action !== 'relocate' || out.chosenPlaceId == null) return keep

  const candidate = geocode.byPlaceId.get(out.chosenPlaceId)
  if (!candidate) return keep

  const rawArea =
    candidate.geojson ?? (candidate.boundingbox ? bboxToPolygon(candidate.boundingbox) : null)
  // Geocoder polygons (a country/state/biome) can carry thousands of vertices;
  // simplify before persisting so the stored `area` stays small enough to serve.
  const area = rawArea ? simplifyAreaGeometry(rawArea, areaSimplifyTolerance(target.scale)) : null
  return {
    action: 'relocate',
    confidence: out.confidence,
    reason: out.reason,
    latitude: candidate.lat,
    longitude: candidate.lon,
    area,
    locationName,
  }
}

export async function applyLocationFix(
  ctx: Ctx,
  target: LocationTarget,
  verdict: LocationVerdict,
): Promise<void> {
  const { db } = ctx
  if (verdict.confidence < LOCATION_FIX_CONFIDENCE) return

  // Coordinate / area change — only on a validated relocate that actually moves the point.
  const { latitude, longitude } = verdict
  const current = target.location
  let point: { x: number; y: number } | null = null
  if (
    verdict.action === 'relocate' &&
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  ) {
    const samePoint =
      Math.abs(current.y - latitude) < LOCATION_MIN_SHIFT_DEG &&
      Math.abs(current.x - longitude) < LOCATION_MIN_SHIFT_DEG
    if (!samePoint || verdict.area != null) point = { x: longitude, y: latitude }
  }
  const movedPoint = point != null

  // Location-name text change — independent of the point decision.
  const newName = verdict.locationName?.trim() || null
  const renamed = newName != null && newName !== target.locationName

  if (!movedPoint && !renamed) return

  const patch = {
    ...(movedPoint ? { location: point!, area: verdict.area } : {}),
    ...(renamed ? { locationName: newName! } : {}),
  }
  if (target.kind === 'issue') {
    await db.update(issues).set(patch).where(eq(issues.id, target.id))
  } else {
    await db.update(caseStudies).set(patch).where(eq(caseStudies.id, target.id))
  }

  await createAuditLog(db, {
    type: 'moderation',
    action: 'relocate',
    status: 'needs_review',
    issueId: target.kind === 'issue' ? target.id : null,
    userId: target.authorId,
    reason: verdict.reason,
    details: {
      kind: target.kind,
      ...(target.kind === 'case-study' ? { caseStudyId: target.id } : {}),
      locationName: target.locationName,
      ...(renamed ? { newLocationName: newName } : {}),
      ...(movedPoint
        ? { from: { latitude: current.y, longitude: current.x }, to: { latitude, longitude } }
        : {}),
      movedPoint,
      renamed,
      hasArea: verdict.area != null,
      confidence: verdict.confidence,
      promptVersion: STEPS['location.resolve'].version,
    },
  })
  const moveMsg = movedPoint ? `→ ${latitude}, ${longitude}` : '(point kept)'
  const nameMsg = renamed ? `, name → "${newName}"` : ''
  console.log(
    `[review-${target.kind}] ${target.kind} ${target.id} relocated ${moveMsg}${nameMsg} (${verdict.reason})`,
  )
}

export interface IssueCurationResult {
  summary: string | null
  description: string | null
  notes: string
}

const SUMMARY_MAX = 280

export async function applyIssueCurate(
  ctx: Ctx,
  prep: IssuePrep,
  curate: IssueCurationResult,
): Promise<void> {
  const { db } = ctx
  const issueId = prep.issue.id
  const updates: { summary?: string; description?: string } = {}
  const changed: string[] = []

  if (curate.summary != null) {
    const trimmed = curate.summary.trim().slice(0, SUMMARY_MAX)
    if (trimmed && trimmed !== prep.summary) {
      updates.summary = trimmed
      changed.push('summary')
    }
  }
  if (curate.description != null && curate.description.trim() !== (prep.description ?? '').trim()) {
    updates.description = curate.description
    changed.push('description')
  }
  if (changed.length === 0) return

  let embedding: number[] | null = null
  if (updates.summary != null) {
    try {
      embedding = await embed(ctx.openai, `${prep.title}\n${updates.summary}`)
    } catch (err) {
      console.error(`[review-issue] Re-embedding after curation failed for issue ${issueId}:`, err)
    }
  }

  await db
    .update(issues)
    .set({ ...updates, ...(embedding ? { embedding } : {}) })
    .where(eq(issues.id, issueId))
  await createAuditLog(db, {
    type: 'moderation',
    action: 'curate',
    issueId,
    userId: prep.issue.authorId,
    reason: curate.notes,
    details: { fields: changed, notes: curate.notes, promptVersion: STEPS['issue.curate'].version },
  })
  console.log(`[review-issue] Issue ${issueId} curated (${changed.join(', ')})`)
}

export async function rejectCaseStudy(
  ctx: Ctx,
  cs: CaseStudyRow,
  moderation: CaseStudyModeration,
): Promise<void> {
  const { db } = ctx
  await db
    .update(caseStudies)
    .set({
      status: 'rejected',
      rejectionReason: moderation.reason,
      rejectedAt: new Date(),
      isSpam: moderation.isSpam ?? false,
    })
    .where(eq(caseStudies.id, cs.id))
  let action: 'flag_spam' | 'flag_duplicate' | 'reject' = 'reject'
  if (moderation.isSpam) action = 'flag_spam'
  else if (moderation.duplicateOfId) action = 'flag_duplicate'

  await createAuditLog(db, {
    type: 'moderation',
    action,
    userId: cs.authorId,
    reason: moderation.reason,
    details: {
      caseStudyId: cs.id,
      solutionId: cs.solutionId,
      isSpam: moderation.isSpam,
      duplicateOfId: moderation.duplicateOfId ?? null,
      promptVersion: STEPS['case-study.moderate'].version,
    },
  })
  if (cs.authorId) {
    await checkAndApplyBan(db, cs.authorId)
    await updateUserTrustScore(ctx, cs.authorId)
  }
}

function diffStripped(before: CaseStudyRow, after: CurationResult): string[] {
  const stripped: string[] = []
  const check = (name: string, b: unknown, a: unknown) => {
    const hadValue = Array.isArray(b) ? b.length > 0 : b != null && b !== ''
    const hasValue = Array.isArray(a) ? a !== null && a.length > 0 : a != null && a !== ''
    if (hadValue && !hasValue) stripped.push(name)
  }
  check('description', before.description, after.description)
  check('lessonsLearned', before.lessonsLearned, after.lessonsLearned)
  check('implementer', before.implementer, after.implementer)
  check('fundingSource', before.fundingSource, after.fundingSource)
  check('cost', before.cost, after.cost)
  check('currency', before.currency, after.currency)
  check('scale', before.scale, after.scale)
  check('startDate', before.startDate, after.startDate)
  check('endDate', before.endDate, after.endDate)
  check('metrics', before.metrics, after.metrics)
  check('sources', before.sources, after.sources)
  check('links', before.links, after.links)
  return stripped
}

export async function finalizeCaseStudy(
  ctx: Ctx,
  cs: CaseStudyRow,
  solution: SolutionRef,
  moderation: CaseStudyModeration,
  curated: CurationResult,
): Promise<void> {
  const { db } = ctx
  const caseStudyId = cs.id

  const cleanedText = [
    solution ? `Solution: ${solution.title}` : '',
    solution?.summary ?? '',
    `Location: ${cs.locationName}`,
    curated.implementer ? `Implementer: ${curated.implementer}` : '',
    `Outcome: ${cs.outcome}`,
    curated.description ?? '',
    curated.lessonsLearned?.join('\n') ?? '',
  ]
    .filter(Boolean)
    .join('\n')
    .trim()

  let newEmbedding: number[] | null = null
  try {
    newEmbedding = await embed(ctx.openai, cleanedText)
  } catch (err) {
    console.error(
      `[review-case-study] Embedding regeneration failed for case study ${caseStudyId}:`,
      err,
    )
  }

  const cleanedMetrics =
    curated.metrics?.map((m) => ({
      label: m.label,
      ...(m.baseline != null ? { baseline: m.baseline } : {}),
      ...(m.result != null ? { result: m.result } : {}),
      ...(m.unit != null ? { unit: m.unit } : {}),
    })) ?? null
  const cleanedSources =
    curated.sources?.map((s) => ({ url: s.url, ...(s.title != null ? { title: s.title } : {}) })) ??
    null
  const cleanedLinks =
    curated.links?.map((l) => ({ url: l.url, ...(l.title != null ? { title: l.title } : {}) })) ??
    null

  await db
    .update(caseStudies)
    .set({
      status: 'approved',
      description: curated.description,
      lessonsLearned: curated.lessonsLearned,
      implementer: curated.implementer,
      fundingSource: curated.fundingSource,
      cost: curated.cost,
      currency: curated.currency,
      scale: curated.scale,
      startDate: curated.startDate,
      endDate: curated.endDate,
      metrics: cleanedMetrics,
      sources: cleanedSources,
      links: cleanedLinks,
      ...(newEmbedding ? { embedding: newEmbedding } : {}),
    })
    .where(eq(caseStudies.id, caseStudyId))

  await createAuditLog(db, {
    type: 'moderation',
    action: 'approve',
    userId: cs.authorId,
    reason: moderation.reason,
    details: {
      caseStudyId,
      solutionId: cs.solutionId,
      curation: { notes: curated.notes, strippedFields: diffStripped(cs, curated) },
      promptVersion: STEPS['case-study.moderate'].version,
    },
  })
  if (cs.authorId) await updateUserTrustScore(ctx, cs.authorId)
}
