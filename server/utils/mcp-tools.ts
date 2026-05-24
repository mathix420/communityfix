import { and, count, desc, eq, ilike, inArray, isNull, ne, or, sql } from 'drizzle-orm'
import { caseStudies, issues, qualificationEndorsements, qualifications, tags, users } from '../database/schema'
import type { IssueType } from '../database/schema'
import { generateEmbedding } from './embeddings'
import { isAdminEmail } from './admin'
import { issueWithRelations, transformIssue } from './transform-issue'
import { createIssue, updateIssue } from './issue-write'
import type { CreateIssueInput, UpdateIssueInput } from './issue-write'
import { createCaseStudy, transformCaseStudy, updateCaseStudy } from './case-study-write'
import type { CreateCaseStudyInput, UpdateCaseStudyInput } from './case-study-write'
import { getIssueTree } from './issue-tree'
import { cfWaitUntil } from './wait-until'

const SEARCH_SIMILARITY_THRESHOLD = 0.25
const SUGGEST_LIMIT = 8

export async function searchByQuery(input: {
  query: string
  type?: IssueType | 'any'
  limit?: number
}) {
  const trimmed = input.query.trim()
  if (trimmed.length < 3) return { status: 'too_short' as const, results: [] }
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 25)

  let embedding: number[]
  try {
    embedding = await generateEmbedding(trimmed)
  }
  catch (err) {
    console.error('[mcp.search] embedding failed:', err)
    return { status: 'embeddings_unavailable' as const, results: [] }
  }

  // Two-step: raw SQL ranks ids, then the typed query hydrates rows so the
  // response goes through the canonical transformIssue.
  const embeddingStr = `[${embedding.join(',')}]`
  const typeFilter = (input.type && input.type !== 'any') ? sql` AND type = ${input.type}` : sql``
  const db = useDB()
  const ranked = await db.execute<{ id: number, similarity: number }>(
    sql`SELECT id, 1 - (embedding <=> ${embeddingStr}::vector) AS similarity
        FROM issues
        WHERE status = 'approved' AND embedding IS NOT NULL${typeFilter}
        ORDER BY embedding <=> ${embeddingStr}::vector
        LIMIT ${limit}`,
  )
  const rankedList = ranked as unknown as Array<{ id: number, similarity: number }>
  const above = rankedList.filter(r => r.similarity > SEARCH_SIMILARITY_THRESHOLD)
  if (above.length === 0) return { status: 'ok' as const, results: [] }

  const ids = above.map(r => r.id)
  const rows = await db.query.issues.findMany({
    where: inArray(issues.id, ids),
    with: issueWithRelations,
  })
  const byId = new Map(rows.map(r => [r.id, r]))
  return {
    status: 'ok' as const,
    results: above
      .map((r) => {
        const row = byId.get(r.id)
        return row ? { ...transformIssue(row), similarity: Math.round(r.similarity * 100) } : null
      })
      .filter((r): r is NonNullable<typeof r> => r !== null),
  }
}

export async function getTree(rootId: number) {
  const db = useDB()
  const root = await db.query.issues.findFirst({
    where: eq(issues.id, rootId),
    with: issueWithRelations,
  })
  if (!root) return null
  return {
    root: transformIssue(root),
    descendants: await getIssueTree(rootId),
  }
}

async function createNode(userId: string, input: CreateIssueInput, label: 'create_issue' | 'create_solution') {
  const created = await createIssue(userId, input)
  const reviewPromise = runTask('review:issue', { payload: { issueId: created.id } })
    .catch(err => console.error(`[mcp.${label}] review failed for ${created.id}:`, err))
  cfWaitUntil(reviewPromise)
  const hydrated = await useDB().query.issues.findFirst({
    where: eq(issues.id, created.id),
    with: issueWithRelations,
  })
  return transformIssue(hydrated!)
}

export async function createIssueAs(userId: string, input: Omit<CreateIssueInput, 'type'>) {
  return createNode(userId, { ...input, type: 'issue' }, 'create_issue')
}

export async function createSolutionAs(userId: string, input: Omit<CreateIssueInput, 'type'>) {
  if (!input.parentId) {
    throw createError({ statusCode: 400, statusMessage: 'parentId is required for a solution' })
  }
  return createNode(userId, { ...input, type: 'solution' }, 'create_solution')
}

async function updateNode(userId: string, input: UpdateIssueInput, expectedType: IssueType, label: 'update_issue' | 'update_solution') {
  const { issue: updated, contentChanged } = await updateIssue(userId, input, expectedType)
  if (contentChanged) {
    const reviewPromise = runTask('review:issue', { payload: { issueId: updated.id } })
      .catch(err => console.error(`[mcp.${label}] review failed for ${updated.id}:`, err))
    cfWaitUntil(reviewPromise)
  }
  const hydrated = await useDB().query.issues.findFirst({
    where: eq(issues.id, updated.id),
    with: issueWithRelations,
  })
  return transformIssue(hydrated!)
}

export async function updateIssueAs(userId: string, input: Omit<UpdateIssueInput, 'solutionStatus'>) {
  return updateNode(userId, input, 'issue', 'update_issue')
}

export async function updateSolutionAs(userId: string, input: UpdateIssueInput) {
  return updateNode(userId, input, 'solution', 'update_solution')
}

async function hydrateCaseStudy(id: number) {
  const row = await useDB().query.caseStudies.findFirst({
    where: eq(caseStudies.id, id),
    with: { author: { columns: { name: true } } },
  })
  return row ? transformCaseStudy(row) : null
}

export async function createCaseStudyAs(userId: string, input: CreateCaseStudyInput) {
  const created = await createCaseStudy(userId, input)
  return (await hydrateCaseStudy(created.id))!
}

export async function updateCaseStudyAs(userId: string, input: UpdateCaseStudyInput) {
  const updated = await updateCaseStudy(userId, input)
  return (await hydrateCaseStudy(updated.id))!
}

export async function getCaseStudyById(id: number) {
  return hydrateCaseStudy(id)
}

export async function listCaseStudiesFor(nodeId: number) {
  const db = useDB()
  const root = await db.query.issues.findFirst({
    where: eq(issues.id, nodeId),
    columns: { id: true, type: true },
  })
  if (!root) return null

  let solutionIds: number[]
  if (root.type === 'solution') {
    solutionIds = [root.id]
  }
  else {
    const solutionRows = await db.query.issues.findMany({
      where: and(eq(issues.parentId, root.id), eq(issues.type, 'solution'), eq(issues.status, 'approved')),
      columns: { id: true },
    })
    solutionIds = solutionRows.map(r => r.id)
  }
  if (solutionIds.length === 0) return []

  const rows = await db.query.caseStudies.findMany({
    where: inArray(caseStudies.solutionId, solutionIds),
    with: { author: { columns: { name: true } } },
    orderBy: [desc(caseStudies.verified), desc(caseStudies.createdAt)],
  })
  return rows.map(transformCaseStudy)
}

export async function suggestMore(seedId: number, limit = SUGGEST_LIMIT) {
  const db = useDB()
  const seed = await db.query.issues.findFirst({
    where: eq(issues.id, seedId),
    with: issueWithRelations,
  })
  if (!seed) return { status: 'not_found' as const, results: [] }
  if (!seed.embedding) return { status: 'no_embedding' as const, results: [] }

  const embeddingStr = `[${(seed.embedding as number[]).join(',')}]`
  const ranked = await db.execute<{ id: number, similarity: number }>(
    sql`SELECT id, 1 - (embedding <=> ${embeddingStr}::vector) AS similarity
        FROM issues
        WHERE status = 'approved' AND embedding IS NOT NULL AND id <> ${seedId}
        ORDER BY embedding <=> ${embeddingStr}::vector
        LIMIT ${Math.min(Math.max(limit, 1), 25)}`,
  )
  const rankedList = ranked as unknown as Array<{ id: number, similarity: number }>
  if (rankedList.length === 0) {
    return { status: 'ok' as const, seed: transformIssue(seed), results: [] }
  }

  const ids = rankedList.map(r => r.id)
  const rows = await db.query.issues.findMany({
    where: inArray(issues.id, ids),
    with: issueWithRelations,
  })
  const byId = new Map(rows.map(r => [r.id, r]))
  return {
    status: 'ok' as const,
    seed: transformIssue(seed),
    results: rankedList
      .map((r) => {
        const row = byId.get(r.id)
        return row ? { ...transformIssue(row), similarity: Math.round(r.similarity * 100) } : null
      })
      .filter((r): r is NonNullable<typeof r> => r !== null),
  }
}

export async function getIssueById(id: number) {
  const db = useDB()
  const row = await db.query.issues.findFirst({
    where: and(eq(issues.id, id), ne(issues.status, 'rejected')),
    with: issueWithRelations,
  })
  return row ? transformIssue(row) : null
}

async function loadProfile(userId: string, opts: { isSelf: boolean }) {
  const db = useDB()
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) return null

  const ownQualifications = await db.query.qualifications.findMany({
    where: eq(qualifications.userId, user.id),
    orderBy: [desc(qualifications.createdAt)],
  })
  const qIds = ownQualifications.map(q => q.id)

  const rawCounts = qIds.length
    ? await db
        .select({
          qualificationId: qualificationEndorsements.qualificationId,
          kind: qualificationEndorsements.kind,
          n: count(qualificationEndorsements.id).as('n'),
        })
        .from(qualificationEndorsements)
        .where(inArray(qualificationEndorsements.qualificationId, qIds))
        .groupBy(qualificationEndorsements.qualificationId, qualificationEndorsements.kind)
    : []
  const endorseCount = new Map<number, number>()
  const verifiedQualifications = new Set<number>()
  for (const c of rawCounts) {
    if (c.kind === 'verification') {
      if (Number(c.n) > 0) verifiedQualifications.add(c.qualificationId)
    }
    else {
      endorseCount.set(c.qualificationId, (endorseCount.get(c.qualificationId) ?? 0) + Number(c.n))
    }
  }
  const isAdmin = isAdminEmail(user.email)

  const visibility = opts.isSelf ? undefined : ne(issues.status, 'rejected')
  const [{ issuesCount }] = await db
    .select({ issuesCount: count(issues.id).as('issuesCount') })
    .from(issues)
    .where(and(eq(issues.authorId, user.id), isNull(issues.parentId), visibility ?? sql`true`)) as [{ issuesCount: number }]
  const [{ solutionsCount }] = await db
    .select({ solutionsCount: count(issues.id).as('solutionsCount') })
    .from(issues)
    .where(and(eq(issues.authorId, user.id), eq(issues.type, 'solution'), visibility ?? sql`true`)) as [{ solutionsCount: number }]
  const [{ caseStudiesCount }] = await db
    .select({ caseStudiesCount: count(caseStudies.id).as('caseStudiesCount') })
    .from(caseStudies)
    .where(eq(caseStudies.authorId, user.id)) as [{ caseStudiesCount: number }]

  return {
    id: user.id,
    name: user.name,
    headline: user.headline,
    bio: user.bio,
    location: user.location,
    trustScore: user.trustScore,
    isAdmin,
    endorsementsReceived: [...endorseCount.values()].reduce((sum, n) => sum + n, 0),
    issuesAuthored: Number(issuesCount),
    solutionsAuthored: Number(solutionsCount),
    caseStudiesAuthored: Number(caseStudiesCount),
    qualifications: ownQualifications.map(q => ({
      id: q.id,
      title: q.title,
      area: q.area,
      detail: q.detail,
      endorsementCount: endorseCount.get(q.id) ?? 0,
      isVerified: verifiedQualifications.has(q.id) || isAdmin,
      createdAt: q.createdAt?.toISOString() ?? null,
    })),
    createdAt: user.createdAt?.toISOString() ?? null,
    ...(opts.isSelf && {
      email: user.email,
      provider: user.provider,
      bannedUntil: user.bannedUntil?.toISOString() ?? null,
      banReason: user.banReason,
    }),
  }
}

export async function getUserProfile(targetUserId: string, viewerId: string) {
  return loadProfile(targetUserId, { isSelf: targetUserId === viewerId })
}

export async function getMe(userId: string) {
  return loadProfile(userId, { isSelf: true })
}

const TAG_SIMILARITY_THRESHOLD = 0.2

export async function searchTags(input: { query?: string, limit?: number }) {
  const db = useDB()
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100)
  const trimmed = input.query?.trim() ?? ''

  if (!trimmed) {
    const rows = await db.query.tags.findMany({ orderBy: [tags.name], limit })
    return {
      status: 'ok' as const,
      query: trimmed,
      results: rows.map(t => ({ id: t.id, slug: t.slug, name: t.name })),
    }
  }

  let embedding: number[]
  try {
    embedding = await generateEmbedding(trimmed)
  }
  catch (err) {
    console.error('[mcp.search_tags] embedding failed, falling back to ILIKE:', err)
    const rows = await db.query.tags.findMany({
      where: or(ilike(tags.slug, `%${trimmed}%`), ilike(tags.name, `%${trimmed}%`)),
      orderBy: [tags.name],
      limit,
    })
    return {
      status: 'fallback_ilike' as const,
      query: trimmed,
      results: rows.map(t => ({ id: t.id, slug: t.slug, name: t.name })),
    }
  }

  const embeddingStr = `[${embedding.join(',')}]`
  const ranked = await db.execute<{ id: number, similarity: number }>(
    sql`SELECT id, 1 - (embedding <=> ${embeddingStr}::vector) AS similarity
        FROM tags
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> ${embeddingStr}::vector
        LIMIT ${limit}`,
  )
  const rankedList = ranked as unknown as Array<{ id: number, similarity: number }>
  const above = rankedList.filter(r => r.similarity > TAG_SIMILARITY_THRESHOLD)
  if (above.length === 0) return { status: 'ok' as const, query: trimmed, results: [] }

  const ids = above.map(r => r.id)
  const rows = await db.query.tags.findMany({ where: inArray(tags.id, ids) })
  const byId = new Map(rows.map(t => [t.id, t]))
  return {
    status: 'ok' as const,
    query: trimmed,
    results: above
      .map((r) => {
        const t = byId.get(r.id)
        return t ? { id: t.id, slug: t.slug, name: t.name, similarity: Math.round(r.similarity * 100) } : null
      })
      .filter((r): r is NonNullable<typeof r> => r !== null),
  }
}
