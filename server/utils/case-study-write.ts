// Shared write-side logic for case studies. Used by REST endpoints (and any
// future MCP tool) so embedding generation, validation, and admin-only flags
// stay in one place.
import { and, eq } from 'drizzle-orm'
import { caseStudies, issues, users } from '../database/schema'
import type { CaseStudyOutcome, LocationScale } from '../database/schema'
import { assertNotBanned } from './check-ban'
import { isAdminEmail } from './admin'
import { generateEmbedding } from './embeddings'
import { sanitizeLinks, type Link } from './issue-write'

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
  runTask('review:case-study', { payload: { caseStudyId: created.id } }).catch((err) => {
    console.error(`[case-study:create] Failed to queue moderation for case study ${created.id}:`, err)
  })

  return created
}

export async function updateCaseStudy(userId: string, input: UpdateCaseStudyInput) {
  const db = useDB()
  const existing = await db.query.caseStudies.findFirst({ where: eq(caseStudies.id, input.id) })
  if (!existing) throw createError({ statusCode: 404, statusMessage: `Case study ${input.id} not found` })

  const me = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { email: true } })
  const isAdmin = isAdminEmail(me?.email)
  if (existing.authorId !== userId && !isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Only the author or an admin can update this case study' })
  }
  if (!isAdmin) await assertNotBanned(userId)

  const patch: Partial<typeof caseStudies.$inferInsert> = { updatedAt: new Date() }
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
    runTask('review:case-study', { payload: { caseStudyId: input.id } }).catch((err) => {
      console.error(`[case-study:update] Failed to queue moderation for case study ${input.id}:`, err)
    })
  }
  return rows[0]!
}

export function transformCaseStudy(row: typeof caseStudies.$inferSelect & { author?: { name: string | null } | null }) {
  if (!row.createdAt) {
    throw new Error(`[transformCaseStudy] Case study ${row.id} has no createdAt`)
  }
  return {
    id: row.id,
    solutionId: row.solutionId,
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
