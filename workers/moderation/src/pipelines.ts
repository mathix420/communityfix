// The moderation logic itself, ported from server/utils/review-*.ts and split
// into discrete, JSON-serializable units so the Workflow can run them as durable
// steps (and, for the issue review, fan three AI calls out in parallel).
import { eq, sql } from 'drizzle-orm'
import {
  caseStudies, issues, sdgs, tags, issueTags, issueSdgs,
  LOCATION_SCALES, type LocationScale,
} from '../../../server/database/schema'
import {
  type Ctx, chatJson, embed, findSimilar, createAuditLog,
  updateUserTrustScore, checkAndApplyBan,
} from './lib'

const DUPLICATE_THRESHOLD = 0.92
const CONFIDENCE_THRESHOLD = 0.7

// ── Issue / solution review ───────────────────────────────────────────────────
interface IssueRef { id: number, type: 'issue' | 'solution', parentId: number | null, authorId: string | null }
interface SimilarIssue { id: number, title: string, summary: string, similarity: number }
interface RefItem { id: number, name: string }

export interface IssuePrep {
  issue: IssueRef
  issueText: string
  duplicateContext: string
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
export interface TagResult { existingTagIds: number[], newTagNames: string[] }
export interface SdgResult { sdgIds: number[] }

/** Step 1: load the issue, embed it, and gather similar issues + reference data. */
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
  ].filter(Boolean).join('\n')

  let embedding: number[] | null = null
  try {
    embedding = await embed(ctx.openai, `${issue.title}\n${issue.summary}`)
  }
  catch (err) {
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

  const duplicateContext = similar.length > 0
    ? `\n\nExisting similar issues (high similarity may indicate a duplicate):\n${similar.map(s => `- [id:${s.id}, similarity:${(s.similarity * 100).toFixed(0)}%] "${s.title}" — ${s.summary}`).join('\n')}`
    : ''

  return {
    issue: { id: issue.id, type: issue.type, parentId: issue.parentId, authorId: issue.authorId },
    issueText,
    duplicateContext,
    similar,
    embedding,
    allTags,
    allSdgs,
  }
}

/** Parallel step A: the moderation decision. */
export function moderateIssue(ctx: Ctx, prep: IssuePrep): Promise<ModerationResult> {
  return chatJson<ModerationResult>(ctx.anthropic, {
    system: `You are a content moderator for a community problem-solving platform. Evaluate if this submission is a legitimate community issue. Reject spam, gibberish, hate speech, or off-topic content. Set isSpam to true for spam, gibberish, or bot content; false for off-topic or low-quality content that was submitted in good faith.

If the submission is very similar to an existing issue (similarity above 90%), set duplicateOfId to that issue's id and reject it as a duplicate — unless it adds a meaningfully different angle or scope.

Set "confidence" to a value between 0 and 1 reflecting how certain you are about your decision:
- 0.9-1.0: Clear-cut (obvious spam, clearly legitimate, obvious duplicate)
- 0.7-0.9: Fairly confident but some ambiguity
- Below 0.7: Uncertain — the submission is borderline or you need more context to decide

When your confidence is below 0.7, populate "questions" with 1-3 specific questions you would ask the author to help you decide. For example: "Could you clarify what specific community this affects?" or "How does this differ from existing issue #X?"`,
    user: prep.issueText + prep.duplicateContext,
    schema: {
      type: 'object',
      properties: {
        approved: { type: 'boolean' },
        reason: { type: 'string' },
        isSpam: { type: 'boolean' },
        duplicateOfId: { type: ['integer', 'null'] },
        confidence: { type: 'number' },
        questions: { type: ['array', 'null'], items: { type: 'string' } },
      },
      required: ['approved', 'reason', 'isSpam', 'duplicateOfId', 'confidence'],
      additionalProperties: false,
    },
    context: `moderation for issue ${prep.issue.id}`,
  })
}

/** Parallel step B: tag classification. */
export function classifyTags(ctx: Ctx, prep: IssuePrep): Promise<TagResult> {
  return chatJson<TagResult>(ctx.anthropic, {
    system: `You classify community issues into relevant tags. Pick 1-3 tags from the provided list that best describe this issue. If no existing tag fits, suggest one new tag name.\n\nAvailable tags:\n${prep.allTags.map(t => `- id:${t.id} "${t.name}"`).join('\n')}`,
    user: prep.issueText,
    schema: {
      type: 'object',
      properties: {
        existingTagIds: { type: 'array', items: { type: 'integer' } },
        newTagNames: { type: 'array', items: { type: 'string' } },
      },
      required: ['existingTagIds', 'newTagNames'],
      additionalProperties: false,
    },
    context: `tag classification for issue ${prep.issue.id}`,
  })
}

/** Parallel step C: SDG mapping. */
export function mapSdgs(ctx: Ctx, prep: IssuePrep): Promise<SdgResult> {
  return chatJson<SdgResult>(ctx.anthropic, {
    system: `You map community issues to relevant UN Sustainable Development Goals. Pick 1-3 SDGs that this issue relates to.\n\nAvailable SDGs:\n${prep.allSdgs.map(s => `- id:${s.id} "${s.name}"`).join('\n')}`,
    user: prep.issueText,
    schema: {
      type: 'object',
      properties: { sdgIds: { type: 'array', items: { type: 'integer' } } },
      required: ['sdgIds'],
      additionalProperties: false,
    },
    context: `SDG mapping for issue ${prep.issue.id}`,
  })
}

/** Final step: combine the AI results and persist the decision. Returns whether
 *  the issue was approved (so the workflow knows to run a structural review). */
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

  // Hard duplicate override — vector similarity is a signal that doesn't need
  // LLM judgement.
  const nearDuplicate = similar.find(s => s.similarity >= DUPLICATE_THRESHOLD)
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
      await db.update(issues)
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
        similarIssues: similar.slice(0, 3).map(s => ({ id: s.id, similarity: s.similarity })),
      },
    })
    console.log(`[review-issue] Issue ${issueId} flagged as uncertain (confidence: ${confidence}). Awaiting review.`)
    return { approved: false }
  }

  if (!moderation.approved) {
    if (issue.parentId) {
      const counter = issue.type === 'solution'
        ? { solutionCount: sql`GREATEST(${issues.solutionCount} - 1, 0)` }
        : { subIssueCount: sql`GREATEST(${issues.subIssueCount} - 1, 0)` }
      await db.update(issues).set(counter).where(eq(issues.id, issue.parentId))
    }
    await db.update(issues)
      .set({ status: 'rejected', rejectionReason: moderation.reason, rejectedAt: new Date(), isSpam: moderation.isSpam ?? false })
      .where(eq(issues.id, issueId))
    await createAuditLog(db, {
      type: 'moderation',
      action: moderation.isSpam ? 'flag_spam' : (moderation.duplicateOfId ? 'flag_duplicate' : 'reject'),
      issueId,
      userId: issue.authorId,
      reason: moderation.reason,
      details: {
        confidence,
        duplicateOfId: moderation.duplicateOfId ?? null,
        isSpam: moderation.isSpam,
        similarIssues: similar.slice(0, 3).map(s => ({ id: s.id, similarity: s.similarity })),
      },
    })
    if (issue.authorId) {
      await checkAndApplyBan(db, issue.authorId)
      await updateUserTrustScore(ctx, issue.authorId)
    }
    return { approved: false }
  }

  // Approved — create any new tags, validate, then persist tags + SDGs + status.
  const newTagIds: number[] = []
  for (const name of tagResult.newTagNames ?? []) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const [newTag] = await db.insert(tags).values({ name, slug }).onConflictDoNothing({ target: tags.slug }).returning()
    if (newTag) { newTagIds.push(newTag.id) }
    else {
      const existing = await db.query.tags.findFirst({ where: eq(tags.slug, slug) })
      if (existing) newTagIds.push(existing.id)
    }
  }

  const allTagIds = [...(tagResult.existingTagIds ?? []), ...newTagIds]
  const validTagIds = Array.from(new Set(
    allTagIds.filter(id => prep.allTags.some(t => t.id === id) || newTagIds.includes(id)),
  ))
  const validSdgIds = Array.from(new Set(
    (sdgResult.sdgIds ?? []).filter(id => prep.allSdgs.some(s => s.id === id)),
  ))

  await db.transaction(async (tx) => {
    await tx.update(issues)
      .set({ status: 'approved', ...(embedding ? { embedding } : {}) })
      .where(eq(issues.id, issueId))
    if (validTagIds.length) await tx.insert(issueTags).values(validTagIds.map(tagId => ({ issueId, tagId })))
    if (validSdgIds.length) await tx.insert(issueSdgs).values(validSdgIds.map(sdgId => ({ issueId, sdgId })))
  })

  await createAuditLog(db, {
    type: 'moderation',
    action: 'approve',
    issueId,
    userId: issue.authorId,
    reason: moderation.reason,
    details: { confidence, tags: validTagIds, sdgs: validSdgIds, newTags: tagResult.newTagNames },
  })
  if (issue.authorId) await updateUserTrustScore(ctx, issue.authorId)

  return { approved: true }
}

// ── Structural review ─────────────────────────────────────────────────────────
interface StructurePrep {
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
  ].filter(Boolean).join('\n')

  const similar = await findSimilar<{ id: number, type: string, title: string, summary: string, parentId: number | null, similarity: number }>(db, {
    table: 'issues',
    columns: 'id, type, title, summary, parent_id AS "parentId"',
    embedding: issue.embedding as number[],
    where: sql`status = 'approved' AND id <> ${issueId}`,
    limit: 10,
    threshold: 0.6,
  })
  if (similar.length === 0) return null

  const parentIds = [...new Set(similar.map(s => s.parentId).filter(Boolean))] as number[]
  let parents: Array<{ id: number, title: string, type: string }> = []
  if (parentIds.length > 0) {
    parents = await db.execute<{ id: number, title: string, type: string }>(
      sql`SELECT id, title, type FROM issues WHERE id = ANY(${parentIds}) AND status = 'approved'`,
    ) as unknown as Array<{ id: number, title: string, type: string }>
  }

  const contextLines = similar.map((s) => {
    const parentLabel = s.parentId
      ? ` (child of #${s.parentId}: "${parents.find(p => p.id === s.parentId)?.title ?? '?'}")`
      : ' (top-level)'
    return `- #${s.id} [${s.type}] "${s.title}" — ${s.summary} | similarity: ${(s.similarity * 100).toFixed(0)}%${parentLabel}`
  }).join('\n')

  return {
    issue: { id: issue.id, type: issue.type, parentId: issue.parentId, authorId: issue.authorId },
    issueText,
    contextLines,
  }
}

export function structureVerdict(ctx: Ctx, prep: StructurePrep): Promise<StructureVerdict> {
  return chatJson<StructureVerdict>(ctx.anthropic, {
    system: `You are a structural reviewer for a community problem-solving platform that organizes issues and solutions in a tree.

The tree has two node types:
- **issue**: a problem or sub-problem. Issues can nest (sub-issues under a parent issue).
- **solution**: a proposed approach to solve a parent issue. Solutions are always leaves.

A separate entity — **case study** — documents a real-world deployment of a solution (specific location, dates, outcomes, metrics). Case studies are NOT part of the issue/solution tree; they attach to a solution.

You are given a newly approved item and a list of existing similar items. Decide the best structural action:

1. **none** — the item is correctly placed, no changes needed.
2. **duplicate** — the item is essentially the same as an existing item (same scope, same angle). Set targetId to the existing item's id.
3. **reparent** — the item should be a child (sub-issue or solution) of an existing issue. Set targetId to that parent issue's id. Only suggest this for top-level items that clearly belong under an existing issue.
4. **convert_to_case_study** — the item is typed as a solution but actually describes a specific real-world implementation (mentions a specific place, organization, dates, outcomes, or measured results). It should be a case study instead. Set targetId to the existing solution it documents, or to the parent issue if no matching solution exists.

Be conservative: only suggest an action when the evidence is clear. When in doubt, choose "none".`,
    user: `New item (id: ${prep.issue.id}, type: ${prep.issue.type}, parentId: ${prep.issue.parentId ?? 'none'}):\n${prep.issueText}\n\nExisting similar items:\n${prep.contextLines}`,
    schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['none', 'duplicate', 'reparent', 'convert_to_case_study'] },
        targetId: { type: ['integer', 'null'] },
        reason: { type: 'string' },
      },
      required: ['action', 'targetId', 'reason'],
      additionalProperties: false,
    },
    context: `structural review for ${prep.issue.type} ${prep.issue.id}`,
  })
}

async function rejectForStructure(ctx: Ctx, issue: IssueRef, reason: string) {
  const { db } = ctx
  if (issue.parentId) {
    const counter = issue.type === 'solution'
      ? { solutionCount: sql`GREATEST(${issues.solutionCount} - 1, 0)` }
      : { subIssueCount: sql`GREATEST(${issues.subIssueCount} - 1, 0)` }
    await db.update(issues).set(counter).where(eq(issues.id, issue.parentId))
  }
  await db.update(issues)
    .set({ status: 'rejected', rejectionReason: reason, rejectedAt: new Date() })
    .where(eq(issues.id, issue.id))
}

export async function applyStructure(ctx: Ctx, prep: StructurePrep, verdict: StructureVerdict): Promise<void> {
  const { db } = ctx
  const { issue } = prep
  const issueId = issue.id
  if (verdict.action === 'none') return

  console.log(`[review-structure] ${issue.type} #${issueId}: ${verdict.action} → #${verdict.targetId} — ${verdict.reason}`)

  if (verdict.action === 'duplicate') {
    await rejectForStructure(ctx, issue, `Duplicate of #${verdict.targetId}: ${verdict.reason}`)
    await createAuditLog(db, { type: 'structure', action: 'flag_duplicate', issueId, userId: issue.authorId, reason: verdict.reason, details: { targetId: verdict.targetId } })
    return
  }

  if (verdict.action === 'reparent' && verdict.targetId && !issue.parentId) {
    const target = await db.query.issues.findFirst({ where: eq(issues.id, verdict.targetId) })
    if (target && target.status === 'approved' && target.type === 'issue') {
      const counter = issue.type === 'solution'
        ? { solutionCount: sql`${issues.solutionCount} + 1` }
        : { subIssueCount: sql`${issues.subIssueCount} + 1` }
      await db.transaction(async (tx) => {
        await tx.update(issues).set({ parentId: verdict.targetId }).where(eq(issues.id, issueId))
        await tx.update(issues).set(counter).where(eq(issues.id, verdict.targetId!))
      })
      await createAuditLog(db, { type: 'structure', action: 'reparent', status: 'needs_review', issueId, reason: verdict.reason, details: { targetId: verdict.targetId, previousParentId: null } })
    }
    return
  }

  if (verdict.action === 'convert_to_case_study' && verdict.targetId && issue.type === 'solution') {
    await rejectForStructure(ctx, issue, `This looks like a case study, not a solution. ${verdict.reason} Consider resubmitting as a case study on solution #${verdict.targetId}.`)
    await createAuditLog(db, { type: 'structure', action: 'convert_to_case_study', status: 'needs_review', issueId, userId: issue.authorId, reason: verdict.reason, details: { targetId: verdict.targetId } })
  }
}

// ── Case study review ─────────────────────────────────────────────────────────
type Metric = { label: string, baseline?: string | null, result?: string | null, unit?: string | null }
type Source = { url: string, title?: string | null }
type LinkRow = { url: string, title?: string | null }
interface CaseStudyModeration { approved: boolean, reason: string, isSpam: boolean }
interface CurationResult {
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
export interface CaseStudyModerateOutcome {
  decision: 'skip' | 'rejected' | 'approved'
  cs?: CaseStudyRow
  solution?: { title: string, summary: string } | null
  moderation?: CaseStudyModeration
}

/** Step 1: load + moderate; on rejection, apply it here (terminal). */
export async function moderateCaseStudy(ctx: Ctx, caseStudyId: number): Promise<CaseStudyModerateOutcome> {
  const { db } = ctx
  const cs = await db.query.caseStudies.findFirst({ where: eq(caseStudies.id, caseStudyId) })
  if (!cs) {
    console.error(`[review-case-study] Case study ${caseStudyId} not found`)
    return { decision: 'skip' }
  }
  if (cs.status !== 'pending') return { decision: 'skip' }

  const solution = await db.query.issues.findFirst({ where: eq(issues.id, cs.solutionId), columns: { title: true, summary: true } })

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
  ].filter(Boolean).join('\n')

  const moderation = await chatJson<CaseStudyModeration>(ctx.anthropic, {
    system: `You are a content moderator for a community problem-solving platform. You are reviewing a case study — a real-world implementation report attached to a solution.

Approve legitimate case studies that document real or plausible implementations with coherent details. Reject:
- Spam, gibberish, or bot-generated nonsense
- Hate speech, harassment, or offensive content
- Clearly fabricated or incoherent content that doesn't describe a real implementation
- Promotional spam disguised as a case study

Be permissive for good-faith submissions — even incomplete or brief case studies should be approved if they appear to describe a genuine effort.`,
    user: caseStudyText,
    schema: {
      type: 'object',
      properties: { approved: { type: 'boolean' }, reason: { type: 'string' }, isSpam: { type: 'boolean' } },
      required: ['approved', 'reason', 'isSpam'],
      additionalProperties: false,
    },
    context: `moderation for case study ${caseStudyId}`,
  })

  if (!moderation.approved) {
    await db.update(caseStudies)
      .set({ status: 'rejected', rejectionReason: moderation.reason, rejectedAt: new Date(), isSpam: moderation.isSpam ?? false })
      .where(eq(caseStudies.id, caseStudyId))
    await createAuditLog(db, {
      type: 'moderation',
      action: moderation.isSpam ? 'flag_spam' : 'reject',
      userId: cs.authorId,
      reason: moderation.reason,
      details: { caseStudyId, solutionId: cs.solutionId, isSpam: moderation.isSpam },
    })
    if (cs.authorId) {
      await checkAndApplyBan(db, cs.authorId)
      await updateUserTrustScore(ctx, cs.authorId)
    }
    return { decision: 'rejected' }
  }

  return { decision: 'approved', cs, solution, moderation }
}

/** Step 2 (approved only): the replication-focused curation pass. */
export function curateCaseStudy(ctx: Ctx, cs: CaseStudyRow, solution: { title: string, summary: string } | null | undefined): Promise<CurationResult> {
  const original = {
    outcome: cs.outcome, locationName: cs.locationName, scale: cs.scale, description: cs.description,
    implementer: cs.implementer, startDate: cs.startDate, endDate: cs.endDate, metrics: cs.metrics,
    cost: cs.cost, currency: cs.currency, fundingSource: cs.fundingSource, sources: cs.sources,
    lessonsLearned: cs.lessonsLearned, links: cs.links,
  }
  const parentContext = [
    solution?.title ? `Parent solution: ${solution.title}` : '',
    solution?.summary ? `Parent summary: ${solution.summary}` : '',
  ].filter(Boolean).join('\n')

  return chatJson<CurationResult>(ctx.anthropic, {
    system: `You are editing a case study attached to a solution on a community problem-solving platform. The case study documents one real-world implementation. Your single goal is to keep only data that helps someone **replicate this solution in another location** and strip everything else.

What counts as replication-relevant:
- Concrete implementation steps, prerequisites, dependencies, or the actor that did the work
- Real numbers: budget, beneficiaries, timeline, measurable outcomes with baseline → result
- Funding mechanics that another team could reuse (named programmes, grant types, financing models)
- Lessons learned that name a specific pitfall, decision, or trade-off — not platitudes
- Credible sources / external links that back the above

What is noise (strip it):
- Generic praise, marketing language, restatements of the parent solution
- Placeholders ("TBD", "varies", "lots", "n/a", "the community")
- Lessons that are universal truths ("communication is important", "plan ahead")
- Metrics with no baseline AND no result, or with non-numeric values that say nothing concrete
- Sources / links that don't resolve to something useful (bare homepages, broken-looking URLs)

Rules:
- Preserve the input language. If the description was written in French, return French.
- For \`description\` and \`lessonsLearned\`: rewrite to keep only sentences with replication value. Do NOT invent details. Return null if nothing useful remains. Do not just restate the parent solution.
- For \`implementer\`, \`fundingSource\`, \`cost\`, \`currency\`, \`startDate\`, \`endDate\`: return the original value if it is concrete and informative; return null otherwise. Do not invent.
- For \`scale\`: return one of ${LOCATION_SCALES.map(s => `"${s}"`).join(', ')} if clearly identifiable, else null.
- For \`metrics\`: keep only rows where the label is specific AND at least one of baseline/result is a real value (not a placeholder). Return null if none qualify.
- For \`sources\` and \`links\`: keep entries whose url looks like a real, specific resource. Return null if none qualify.
- \`notes\`: one short sentence describing what you stripped and why, for the audit log.

Never modify \`outcome\` or \`locationName\` — they are owned by the moderator.`,
    user: `${parentContext}\n\nCase study (original fields):\n${JSON.stringify(original, null, 2)}`,
    schema: {
      type: 'object',
      properties: {
        description: { type: ['string', 'null'] },
        lessonsLearned: { type: ['array', 'null'], items: { type: 'string' } },
        implementer: { type: ['string', 'null'] },
        fundingSource: { type: ['string', 'null'] },
        cost: { type: ['string', 'null'] },
        currency: { type: ['string', 'null'] },
        scale: { anyOf: [{ type: 'string', enum: [...LOCATION_SCALES] }, { type: 'null' }] },
        startDate: { type: ['string', 'null'] },
        endDate: { type: ['string', 'null'] },
        metrics: {
          type: ['array', 'null'],
          items: {
            type: 'object',
            properties: { label: { type: 'string' }, baseline: { type: ['string', 'null'] }, result: { type: ['string', 'null'] }, unit: { type: ['string', 'null'] } },
            required: ['label'],
            additionalProperties: false,
          },
        },
        sources: {
          type: ['array', 'null'],
          items: { type: 'object', properties: { url: { type: 'string' }, title: { type: ['string', 'null'] } }, required: ['url'], additionalProperties: false },
        },
        links: {
          type: ['array', 'null'],
          items: { type: 'object', properties: { url: { type: 'string' }, title: { type: ['string', 'null'] } }, required: ['url'], additionalProperties: false },
        },
        notes: { type: 'string' },
      },
      required: ['description', 'lessonsLearned', 'implementer', 'fundingSource', 'cost', 'currency', 'scale', 'startDate', 'endDate', 'metrics', 'sources', 'links', 'notes'],
      additionalProperties: false,
    },
    context: `curation for case study ${cs.id}`,
  })
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

/** Step 3 (approved only): re-embed the curated text and persist. */
export async function finalizeCaseStudy(ctx: Ctx, cs: CaseStudyRow, solution: { title: string, summary: string } | null | undefined, moderation: CaseStudyModeration, curated: CurationResult): Promise<void> {
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
  ].filter(Boolean).join('\n').trim()

  let newEmbedding: number[] | null = null
  try {
    newEmbedding = await embed(ctx.openai, cleanedText)
  }
  catch (err) {
    console.error(`[review-case-study] Embedding regeneration failed for case study ${caseStudyId}:`, err)
  }

  const cleanedMetrics = curated.metrics?.map(m => ({
    label: m.label,
    ...(m.baseline != null ? { baseline: m.baseline } : {}),
    ...(m.result != null ? { result: m.result } : {}),
    ...(m.unit != null ? { unit: m.unit } : {}),
  })) ?? null
  const cleanedSources = curated.sources?.map(s => ({ url: s.url, ...(s.title != null ? { title: s.title } : {}) })) ?? null
  const cleanedLinks = curated.links?.map(l => ({ url: l.url, ...(l.title != null ? { title: l.title } : {}) })) ?? null

  await db.update(caseStudies)
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
    details: { caseStudyId, solutionId: cs.solutionId, curation: { notes: curated.notes, strippedFields: diffStripped(cs, curated) } },
  })
  if (cs.authorId) await updateUserTrustScore(ctx, cs.authorId)
}
