// Shared write-side logic for case studies. Used by REST endpoints (and any
// future MCP tool) so embedding generation, validation, and admin-only flags
// stay in one place.
import { and, eq } from 'drizzle-orm'
import { caseStudies, issues, users } from '../database/schema'
import type { CaseStudyOutcome, LocationScale } from '../database/schema'
import { assertNotBanned } from './check-ban'
import { isAdminEmail } from './admin'
import { triggerModeration } from './moderation-trigger'
import { generateEmbedding } from './embeddings'
import { sanitizeLinks, type Link } from './issue-write'
import { editableCaseStudySnapshot, recordRevision } from './revision-write'
import { isNodeOwner, addNodeMember } from './node-members'

type Metric = { label: string, baseline?: string, result?: string, unit?: string }
type Source = { url: string, title?: string }

export interface CreateCaseStudyInput {
  solutionId: number
  outcome: CaseStudyOutcome
  locationName: string
  latitude: number
  longitude: number
  description?: string | null
  scale?: LocationScale | null
  implementer?: string | null
  startDate?: string | null
  endDate?: string | null
  metrics?: Metric[] | null
  cost?: string | number | null
  currency?: string | null
  fundingSource?: string | null
  sources?: Source[] | null
  lessonsLearned?: string[] | null
  links?: Link[] | null
}

export interface UpdateCaseStudyInput extends Partial<Omit<CreateCaseStudyInput, 'solutionId'>> {
  id: number
  verified?: boolean
  // Re-attach the case study to a different solution (reparent). Validated via
  // assertSolution — the target must be an existing solution.
  solutionId?: number
}

// Embeddings need at least one short string of context — without a title or
// summary we stitch the structured fields together. Falls back to the parent
// solution's title/summary so a case study with nothing but a location and an
// outcome still gets a useful vector.
async function buildEmbeddingText(solutionId: number, input: Partial<CreateCaseStudyInput>): Promise<string> {
  const db = useDB()
  const parent = await db.query.issues.findFirst({
    where: eq(issues.id, solutionId),
    columns: { title: true, summary: true },
  })
  const parts = [
    parent ? `Solution: ${parent.title}` : '',
    parent?.summary ?? '',
    input.locationName ? `Location: ${input.locationName}` : '',
    input.implementer ? `Implementer: ${input.implementer}` : '',
    input.outcome ? `Outcome: ${input.outcome}` : '',
    input.description ?? '',
    Array.isArray(input.lessonsLearned) ? input.lessonsLearned.join('\n') : '',
  ]
  return parts.filter(Boolean).join('\n').trim()
}

async function assertSolution(solutionId: number) {
  const db = useDB()
  const parent = await db.query.issues.findFirst({
    where: and(eq(issues.id, solutionId), eq(issues.type, 'solution')),
    columns: { id: true },
  })
  if (!parent) {
    throw createError({ statusCode: 404, statusMessage: 'Solution not found — case studies attach to solutions only.' })
  }
}

export async function createCaseStudy(authorId: string, input: CreateCaseStudyInput) {
  if (!input.outcome) throw createError({ statusCode: 400, statusMessage: 'Outcome is required' })
  if (!input.locationName?.trim()) throw createError({ statusCode: 400, statusMessage: 'Location name is required' })
  if (input.latitude == null || input.longitude == null) {
    throw createError({ statusCode: 400, statusMessage: 'Latitude and longitude are required' })
  }
  await assertNotBanned(authorId)
  await assertSolution(input.solutionId)

  let embedding: number[] | null = null
  try {
    embedding = await generateEmbedding(await buildEmbeddingText(input.solutionId, input))
  }
  catch (err) {
    console.error(`[case-study:create] Embedding generation failed for solution ${input.solutionId}:`, err)
  }

  const db = useDB()
  const rows = await db.insert(caseStudies).values({
    solutionId: input.solutionId,
    authorId,
    status: 'pending',
    outcome: input.outcome,
    locationName: input.locationName.trim(),
    location: { x: input.longitude, y: input.latitude },
    scale: input.scale ?? null,
    description: input.description?.toString().trim() || null,
    implementer: input.implementer?.toString().trim() || null,
    startDate: input.startDate || null,
    endDate: input.endDate || null,
    metrics: input.metrics ?? null,
    cost: input.cost != null ? String(input.cost) : null,
    currency: input.currency?.toString().trim() || null,
    fundingSource: input.fundingSource?.toString().trim() || null,
    sources: input.sources ?? null,
    lessonsLearned: input.lessonsLearned?.length ? input.lessonsLearned : null,
    links: sanitizeLinks(input.links),
    ...(embedding ? { embedding } : {}),
  }).returning()

  const created = rows[0]!
  await triggerModeration('case-study', created.id)

  // Bootstrap version history with a born-approved "Created" revision.
  // Best-effort — recording history must never fail creation.
  try {
    const snapshot = editableCaseStudySnapshot(created)
    await recordRevision({
      targetKind: 'case_study',
      issueId: null,
      caseStudyId: created.id,
      proposerId: authorId,
      status: 'approved',
      changes: snapshot,
      baseSnapshot: {},
      appliedSnapshot: snapshot,
      decidedById: authorId,
      decidedByRole: 'owner',
      note: 'Created',
    })
  }
  catch (err) {
    console.error(`[case-study:create] Failed to record creation revision for ${created.id}:`, err)
  }

  // Creator becomes the case study's first owner — the membership row, not
  // authorId, is what grants edit/decide rights.
  try {
    await addNodeMember({ kind: 'case_study', nodeId: created.id, userId: authorId, role: 'owner', source: 'creator' })
  }
  catch (err) {
    console.error(`[case-study:create] Failed to seed owner membership for ${created.id}:`, err)
  }

  return created
}

export async function updateCaseStudy(userId: string, input: UpdateCaseStudyInput) {
  const db = useDB()
  const existing = await db.query.caseStudies.findFirst({ where: eq(caseStudies.id, input.id) })
  if (!existing) throw createError({ statusCode: 404, statusMessage: `Case study ${input.id} not found` })

  const me = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { email: true } })
  const isAdmin = isAdminEmail(me?.email)
  // Editing without approval is an owner/admin right (see node_members).
  if (!isAdmin && !(await isNodeOwner(userId, 'case_study', existing.id))) {
    throw createError({ statusCode: 403, statusMessage: 'Only an owner or an admin can update this case study' })
  }
  if (!isAdmin) await assertNotBanned(userId)

  // Editable snapshot before any mutation — lets callers record an accurate
  // born-approved revision without a second read.
  const before = editableCaseStudySnapshot(existing)

  const patch: Partial<typeof caseStudies.$inferInsert> = { updatedAt: new Date() }
  // Re-attach to a different solution (reparent). Validate the target is a
  // real solution, exactly like createCaseStudy does.
  if (input.solutionId !== undefined && input.solutionId !== existing.solutionId) {
    await assertSolution(input.solutionId)
    patch.solutionId = input.solutionId
  }
  if (input.outcome !== undefined) patch.outcome = input.outcome
  if (input.scale !== undefined) patch.scale = input.scale
  if (input.locationName !== undefined && input.locationName.trim()) patch.locationName = input.locationName.trim()
  if (input.latitude !== undefined || input.longitude !== undefined) {
    const lat = input.latitude ?? (existing.location as { y: number } | null)?.y
    const lng = input.longitude ?? (existing.location as { x: number } | null)?.x
    if (lat != null && lng != null) patch.location = { x: lng, y: lat }
  }
  if (input.description !== undefined) patch.description = input.description?.toString().trim() || null
  if (input.implementer !== undefined) patch.implementer = input.implementer?.toString().trim() || null
  if (input.startDate !== undefined) patch.startDate = input.startDate || null
  if (input.endDate !== undefined) patch.endDate = input.endDate || null
  if (input.metrics !== undefined) patch.metrics = input.metrics
  if (input.cost !== undefined) patch.cost = input.cost != null ? String(input.cost) : null
  if (input.currency !== undefined) patch.currency = input.currency?.toString().trim() || null
  if (input.fundingSource !== undefined) patch.fundingSource = input.fundingSource?.toString().trim() || null
  if (input.sources !== undefined) patch.sources = input.sources
  if (input.lessonsLearned !== undefined) patch.lessonsLearned = input.lessonsLearned?.length ? input.lessonsLearned : null
  if (input.links !== undefined) patch.links = sanitizeLinks(input.links)

  // Only admins can flip the verified flag.
  if (input.verified !== undefined && isAdmin) patch.verified = input.verified

  // If a field that feeds the embedding changed, regenerate.
  const textChanged = patch.description !== undefined
    || patch.implementer !== undefined
    || patch.locationName !== undefined
    || patch.outcome !== undefined
    || patch.lessonsLearned !== undefined
  if (textChanged) {
    patch.status = 'pending'
    patch.rejectionReason = null
    patch.rejectedAt = null
    patch.isSpam = false
    try {
      const merged: Partial<CreateCaseStudyInput> = {
        outcome: (patch.outcome ?? existing.outcome) as CaseStudyOutcome,
        locationName: patch.locationName ?? existing.locationName,
        description: patch.description ?? existing.description ?? undefined,
        implementer: patch.implementer ?? existing.implementer ?? undefined,
        lessonsLearned: (patch.lessonsLearned ?? existing.lessonsLearned) as string[] | undefined,
      }
      patch.embedding = await generateEmbedding(await buildEmbeddingText(existing.solutionId, merged))
    }
    catch (err) {
      console.error(`[case-study:update] Embedding regeneration failed for ${input.id}:`, err)
    }
  }

  const rows = await db.update(caseStudies).set(patch).where(eq(caseStudies.id, input.id)).returning()
  if (textChanged) {
    await triggerModeration('case-study', input.id)
  }
  return { caseStudy: rows[0]!, before, contentChanged: textChanged }
}

/**
 * Re-attach a case study to a different solution. Thin wrapper over
 * updateCaseStudy's solutionId path so the revision-apply code has a clearly
 * named structural-move entry point. Returns the updated row.
 */
export async function reparentCaseStudy(userId: string, id: number, solutionId: number) {
  const { caseStudy } = await updateCaseStudy(userId, { id, solutionId })
  return caseStudy
}

export function transformCaseStudy(row: typeof caseStudies.$inferSelect & {
  author?: { name: string | null } | null
  solution?: { title: string | null, summary: string | null } | null
}) {
  if (!row.createdAt) {
    throw new Error(`[transformCaseStudy] Case study ${row.id} has no createdAt`)
  }
  return {
    id: row.id,
    solutionId: row.solutionId,
    // Parent solution title; only set when the caller loads the `solution` relation.
    solutionTitle: row.solution?.title || row.solution?.summary || null,
    authorId: row.authorId,
    author: row.author?.name ?? 'Anonymous',
    status: row.status,
    rejectionReason: row.rejectionReason ?? null,
    outcome: row.outcome,
    scale: row.scale,
    locationName: row.locationName,
    location: row.location ? {
      latitude: (row.location as { x: number, y: number }).y,
      longitude: (row.location as { x: number, y: number }).x,
      area: row.area ?? null,
    } : null,
    verified: row.verified,
    description: row.description,
    implementer: row.implementer,
    startDate: row.startDate,
    endDate: row.endDate,
    metrics: row.metrics,
    cost: row.cost,
    currency: row.currency,
    fundingSource: row.fundingSource,
    sources: row.sources,
    lessonsLearned: row.lessonsLearned,
    links: row.links,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  }
}
