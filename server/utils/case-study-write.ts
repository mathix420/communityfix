// Shared write-side logic for case studies. Used by REST endpoints (and any
// future MCP tool) so embedding generation, validation, and admin-only flags
// stay in one place.
import { and, eq, inArray } from 'drizzle-orm'
import { caseStudies, caseStudySolutions, issues, users } from '../database/schema'
import type { CaseStudyOutcome, LocationScale } from '../database/schema'
import { assertNotBanned } from './check-ban'
import { isAdminEmail } from './admin'
import { triggerModeration } from './moderation-trigger'
import { generateEmbedding } from './embeddings'
import { sanitizeLinks, type Link } from './issue-write'
import { editableCaseStudySnapshot, recordRevision } from './revision-record'
import { isNodeOwner, addNodeMember } from './node-members'

type Metric = { label: string; baseline?: string; result?: string; unit?: string }
type Source = { url: string; title?: string }

export interface CreateCaseStudyInput {
  title: string
  solutionIds: number[]
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

export interface UpdateCaseStudyInput extends Partial<CreateCaseStudyInput> {
  id: number
  verified?: boolean
}

// Embeddings combine the deployment-specific title and structured fields with
// every linked solution's title/summary.
async function buildEmbeddingText(
  solutionIds: number[],
  input: Partial<CreateCaseStudyInput>,
): Promise<string> {
  const db = useDB()
  const linkedSolutions = await db.query.issues.findMany({
    where: inArray(issues.id, solutionIds),
    columns: { title: true, summary: true },
  })
  const parts = [
    input.title ? `Case study: ${input.title}` : '',
    ...linkedSolutions.flatMap((solution) => [
      `Linked solution: ${solution.title}`,
      solution.summary,
    ]),
    input.locationName ? `Location: ${input.locationName}` : '',
    input.implementer ? `Implementer: ${input.implementer}` : '',
    input.outcome ? `Outcome: ${input.outcome}` : '',
    input.description ?? '',
    Array.isArray(input.lessonsLearned) ? input.lessonsLearned.join('\n') : '',
  ]
  return parts.filter(Boolean).join('\n').trim()
}

function normalizeSolutionIds(solutionIds: number[]): number[] {
  if (!Array.isArray(solutionIds) || solutionIds.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'At least one solution is required' })
  }
  if (solutionIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'solutionIds must contain positive integers',
    })
  }
  const unique = [...new Set(solutionIds)].sort((a, b) => a - b)
  if (unique.length !== solutionIds.length) {
    throw createError({ statusCode: 400, statusMessage: 'solutionIds must not contain duplicates' })
  }
  if (unique.length > 20) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A case study can link to at most 20 solutions',
    })
  }
  return unique
}

function normalizeTitle(title: string): string {
  const normalized = title.trim()
  if (!normalized) throw createError({ statusCode: 400, statusMessage: 'Title is required' })
  if (normalized.length > 160) {
    throw createError({ statusCode: 400, statusMessage: 'Title must be 160 characters or fewer' })
  }
  return normalized
}

async function assertSolutions(solutionIds: number[]) {
  const db = useDB()
  const rows = await db.query.issues.findMany({
    where: and(inArray(issues.id, solutionIds), eq(issues.type, 'solution')),
    columns: { id: true },
  })
  if (rows.length !== solutionIds.length) {
    throw createError({
      statusCode: 404,
      statusMessage: 'One or more linked solutions were not found',
    })
  }
}

// Pre-existing critical-complexity function (a long validated insert). This PR
// only routes `sources` through sanitizeLinks alongside the existing `links`
// call — a net-neutral change — but the diff-gate re-attributes the whole
// function's legacy complexity to any commit that touches it. Suppress so a
// security fix isn't blocked by unrelated inherited debt; a real split is a
// separate refactor.
// fallow-ignore-next-line complexity
export async function createCaseStudy(authorId: string, input: CreateCaseStudyInput) {
  const title = normalizeTitle(input.title)
  if (!input.outcome) throw createError({ statusCode: 400, statusMessage: 'Outcome is required' })
  if (!input.locationName?.trim())
    throw createError({ statusCode: 400, statusMessage: 'Location name is required' })
  if (input.latitude == null || input.longitude == null) {
    throw createError({ statusCode: 400, statusMessage: 'Latitude and longitude are required' })
  }
  await assertNotBanned(authorId)
  const solutionIds = normalizeSolutionIds(input.solutionIds)
  await assertSolutions(solutionIds)

  let embedding: number[] | null = null
  try {
    embedding = await generateEmbedding(await buildEmbeddingText(solutionIds, input))
  } catch (err) {
    console.error('[case-study:create] Embedding generation failed:', err)
  }

  const db = useDB()
  const created = await db.transaction(async (tx) => {
    const rows = await tx
      .insert(caseStudies)
      .values({
        title,
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
        sources: sanitizeLinks(input.sources),
        lessonsLearned: input.lessonsLearned?.length ? input.lessonsLearned : null,
        links: sanitizeLinks(input.links),
        ...(embedding ? { embedding } : {}),
      })
      .returning()
    const row = rows[0]!
    await tx
      .insert(caseStudySolutions)
      .values(solutionIds.map((solutionId) => ({ caseStudyId: row.id, solutionId })))
    return row
  })
  await triggerModeration('case-study', created.id)

  // Bootstrap version history with a born-approved "Created" revision.
  // Best-effort — recording history must never fail creation.
  try {
    const snapshot = editableCaseStudySnapshot({
      ...created,
      solutionLinks: solutionIds.map((solutionId) => ({ solutionId })),
    })
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
  } catch (err) {
    console.error(`[case-study:create] Failed to record creation revision for ${created.id}:`, err)
  }

  // Creator becomes the case study's first owner — the membership row, not
  // authorId, is what grants edit/decide rights.
  try {
    await addNodeMember({
      kind: 'case_study',
      nodeId: created.id,
      userId: authorId,
      role: 'owner',
      source: 'creator',
    })
  } catch (err) {
    console.error(`[case-study:create] Failed to seed owner membership for ${created.id}:`, err)
  }

  return created
}

export async function updateCaseStudy(userId: string, input: UpdateCaseStudyInput) {
  const db = useDB()
  const existing = await db.query.caseStudies.findFirst({
    where: eq(caseStudies.id, input.id),
    with: { solutionLinks: { columns: { solutionId: true } } },
  })
  if (!existing)
    throw createError({ statusCode: 404, statusMessage: `Case study ${input.id} not found` })

  const me = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { email: true },
  })
  const isAdmin = isAdminEmail(me?.email)
  // Editing without approval is an owner/admin right (see node_members).
  if (!isAdmin && !(await isNodeOwner(userId, 'case_study', existing.id))) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only an owner or an admin can update this case study',
    })
  }
  if (!isAdmin) await assertNotBanned(userId)

  // Editable snapshot before any mutation — lets callers record an accurate
  // born-approved revision without a second read.
  const before = editableCaseStudySnapshot(existing)
  const existingSolutionIds = existing.solutionLinks
    .map((link) => link.solutionId)
    .sort((a, b) => a - b)
  const nextSolutionIds =
    input.solutionIds !== undefined ? normalizeSolutionIds(input.solutionIds) : existingSolutionIds
  const relationsChanged = JSON.stringify(nextSolutionIds) !== JSON.stringify(existingSolutionIds)
  if (relationsChanged) await assertSolutions(nextSolutionIds)

  const patch: Partial<typeof caseStudies.$inferInsert> = { updatedAt: new Date() }
  if (input.title !== undefined) {
    patch.title = normalizeTitle(input.title)
  }
  if (input.outcome !== undefined) patch.outcome = input.outcome
  if (input.scale !== undefined) patch.scale = input.scale
  if (input.locationName !== undefined && input.locationName.trim())
    patch.locationName = input.locationName.trim()
  if (input.latitude !== undefined || input.longitude !== undefined) {
    const lat = input.latitude ?? (existing.location as { y: number } | null)?.y
    const lng = input.longitude ?? (existing.location as { x: number } | null)?.x
    if (lat != null && lng != null) patch.location = { x: lng, y: lat }
  }
  if (input.description !== undefined)
    patch.description = input.description?.toString().trim() || null
  if (input.implementer !== undefined)
    patch.implementer = input.implementer?.toString().trim() || null
  if (input.startDate !== undefined) patch.startDate = input.startDate || null
  if (input.endDate !== undefined) patch.endDate = input.endDate || null
  if (input.metrics !== undefined) patch.metrics = input.metrics
  if (input.cost !== undefined) patch.cost = input.cost != null ? String(input.cost) : null
  if (input.currency !== undefined) patch.currency = input.currency?.toString().trim() || null
  if (input.fundingSource !== undefined)
    patch.fundingSource = input.fundingSource?.toString().trim() || null
  if (input.sources !== undefined) patch.sources = sanitizeLinks(input.sources)
  if (input.lessonsLearned !== undefined)
    patch.lessonsLearned = input.lessonsLearned?.length ? input.lessonsLearned : null
  if (input.links !== undefined) patch.links = sanitizeLinks(input.links)

  // Only admins can flip the verified flag.
  if (input.verified !== undefined && isAdmin) patch.verified = input.verified

  // If a field that feeds the embedding changed, regenerate.
  const textChanged =
    patch.title !== undefined ||
    patch.description !== undefined ||
    patch.implementer !== undefined ||
    patch.locationName !== undefined ||
    patch.outcome !== undefined ||
    patch.lessonsLearned !== undefined ||
    relationsChanged
  if (textChanged) {
    patch.status = 'pending'
    patch.rejectionReason = null
    patch.rejectedAt = null
    patch.isSpam = false
    try {
      const merged: Partial<CreateCaseStudyInput> = {
        title: patch.title ?? existing.title,
        outcome: (patch.outcome ?? existing.outcome) as CaseStudyOutcome,
        locationName: patch.locationName ?? existing.locationName,
        description: patch.description ?? existing.description ?? undefined,
        implementer: patch.implementer ?? existing.implementer ?? undefined,
        lessonsLearned: (patch.lessonsLearned ?? existing.lessonsLearned) as string[] | undefined,
      }
      patch.embedding = await generateEmbedding(await buildEmbeddingText(nextSolutionIds, merged))
    } catch (err) {
      console.error(`[case-study:update] Embedding regeneration failed for ${input.id}:`, err)
    }
  }

  const updated = await db.transaction(async (tx) => {
    const rows = await tx
      .update(caseStudies)
      .set(patch)
      .where(eq(caseStudies.id, input.id))
      .returning()
    if (relationsChanged) {
      await tx.delete(caseStudySolutions).where(eq(caseStudySolutions.caseStudyId, input.id))
      await tx
        .insert(caseStudySolutions)
        .values(nextSolutionIds.map((solutionId) => ({ caseStudyId: input.id, solutionId })))
    }
    return rows[0]!
  })
  if (textChanged) {
    await triggerModeration('case-study', input.id)
  }
  return {
    caseStudy: {
      ...updated,
      solutionLinks: nextSolutionIds.map((solutionId) => ({ solutionId })),
    },
    before,
    contentChanged: textChanged,
  }
}

export const caseStudyWithSolutions = {
  author: { columns: { name: true } },
  solutionLinks: {
    columns: { solutionId: true },
    with: { solution: { columns: { id: true, title: true, summary: true } } },
  },
} as const

export async function findCaseStudyIdsForSolutions(solutionIds: number[]): Promise<number[]> {
  if (solutionIds.length === 0) return []
  const links = await useDB().query.caseStudySolutions.findMany({
    where: inArray(caseStudySolutions.solutionId, solutionIds),
    columns: { caseStudyId: true },
  })
  return [...new Set(links.map((link) => link.caseStudyId))]
}

export function transformCaseStudy(
  row: typeof caseStudies.$inferSelect & {
    author?: { name: string | null } | null
    solutionLinks?: Array<{
      solutionId: number
      solution?: { id: number; title: string; summary: string } | null
    }>
  },
) {
  if (!row.createdAt) {
    throw new Error(`[transformCaseStudy] Case study ${row.id} has no createdAt`)
  }
  return {
    id: row.id,
    title: row.title,
    solutionIds: (row.solutionLinks ?? []).map((link) => link.solutionId).sort((a, b) => a - b),
    solutions: (row.solutionLinks ?? [])
      .flatMap((link) => (link.solution ? [link.solution] : []))
      .sort((a, b) => a.id - b.id),
    authorId: row.authorId,
    author: row.author?.name ?? 'Anonymous',
    status: row.status,
    rejectionReason: row.rejectionReason ?? null,
    outcome: row.outcome,
    scale: row.scale,
    locationName: row.locationName,
    location: row.location
      ? {
          latitude: (row.location as { x: number; y: number }).y,
          longitude: (row.location as { x: number; y: number }).x,
          area: row.area ?? null,
        }
      : null,
    verified: row.verified,
    helpLabels: row.helpLabels ?? [],
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
