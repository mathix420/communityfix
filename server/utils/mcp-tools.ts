import { and, count, desc, eq, ilike, inArray, isNull, ne, or, sql } from 'drizzle-orm'
import { caseStudies, issues, qualificationEndorsements, qualifications, revisions, tags, users } from '../database/schema'
import type { IssueType, RevisionTargetKind } from '../database/schema'
import { generateEmbedding, findSimilar } from './embeddings'
import { isAdminEmail } from './admin'
import { issueWithRelations, transformIssue } from './transform-issue'
import { createIssue, updateIssue } from './issue-write'
import type { CreateIssueInput, UpdateIssueInput } from './issue-write'
import { createCaseStudy, transformCaseStudy, updateCaseStudy } from './case-study-write'
import type { CreateCaseStudyInput, UpdateCaseStudyInput } from './case-study-write'
import { getIssueTree } from './issue-tree'
import { triggerModeration } from './moderation-trigger'
import { getIsAdmin } from './is-admin'
import {
  canViewRevision,
  decideRevision,
  diffSnapshots,
  editableCaseStudySnapshot,
  editableIssueSnapshot,
  proposeRevision,
  recordRevision,
  serializeRevision,
  type DecideAction,
  type Snapshot,
} from './revision-write'
import { resolveDecideRole, isNodeOwner } from './node-members'

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

  const typeFilter = (input.type && input.type !== 'any') ? sql` AND type = ${input.type}` : sql``
  const db = useDB()
  const above = await findSimilar<{ id: number, similarity: number }>({
    table: 'issues',
    columns: 'id',
    embedding,
    where: sql`status = 'approved'${typeFilter}`,
    limit,
    threshold: SEARCH_SIMILARITY_THRESHOLD,
  })
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

async function createNode(userId: string, input: CreateIssueInput) {
  const created = await createIssue(userId, input)
  await triggerModeration('issue', created.id)
  const hydrated = await useDB().query.issues.findFirst({
    where: eq(issues.id, created.id),
    with: issueWithRelations,
  })
  return transformIssue(hydrated!)
}

export async function createIssueAs(userId: string, input: Omit<CreateIssueInput, 'type'>) {
  return createNode(userId, { ...input, type: 'issue' })
}

export async function createSolutionAs(userId: string, input: Omit<CreateIssueInput, 'type'>) {
  if (!input.parentId) {
    throw createError({ statusCode: 400, statusMessage: 'parentId is required for a solution' })
  }
  return createNode(userId, { ...input, type: 'solution' })
}

// The shape an MCP update / propose tool returns: either the owner/admin direct
// edit (the live, re-hydrated node) or the pending proposal that was recorded
// for a non-owner. `applied` lets the client tell the two apart.
type AppliedNode = { applied: true, node: ReturnType<typeof transformIssue> }
type ProposedNode = { applied: false, revision: ReturnType<typeof serializeRevision> }
type AppliedCaseStudy = { applied: true, caseStudy: NonNullable<Awaited<ReturnType<typeof hydrateCaseStudy>>> }
type ProposedRevision = { applied: false, revision: ReturnType<typeof serializeRevision> }

async function updateNode(
  userId: string,
  input: UpdateIssueInput & { note?: string | null },
  expectedType: IssueType,
): Promise<AppliedNode | ProposedNode> {
  const db = useDB()
  const { note, ...patch } = input
  const node = await db.query.issues.findFirst({ where: eq(issues.id, patch.id) })
  if (!node) throw createError({ statusCode: 404, statusMessage: `Issue ${patch.id} not found` })
  if (node.type !== expectedType) {
    throw createError({
      statusCode: 400,
      statusMessage: `Node ${patch.id} is a ${node.type} — use update_${node.type} instead`,
    })
  }

  const isAdmin = await getIsAdmin(userId)
  const role = await resolveDecideRole(userId, 'issue', node.id, isAdmin)

  // Non-owner / non-admin: record a pending proposal instead of mutating,
  // mirroring the REST PATCH routing. No H3 event here, so the owner email is
  // skipped (best-effort) — the AI pre-screen + in-app inbox still cover it.
  if (!role) {
    const { id, ...fields } = patch
    const changes = issueChangesFromInput(fields, editableIssueSnapshot(node))
    const revision = await proposeRevision(userId, { targetKind: 'issue', targetId: id, changes, note: note ?? null })
    return { applied: false, revision: serializeRevision(revision) }
  }

  // Owner/admin: apply immediately via the single write path, then record a
  // born-approved revision and fire re-moderation as needed.
  const { issue: updated, before, contentChanged, parentChanged } = await updateIssue(userId, patch, expectedType)
  const after = editableIssueSnapshot(updated)
  const changes = diffSnapshots(before, after)
  if (Object.keys(changes).length > 0) {
    await recordRevision({
      targetKind: 'issue',
      issueId: updated.id,
      caseStudyId: null,
      proposerId: userId,
      status: 'approved',
      changes,
      baseSnapshot: before,
      appliedSnapshot: after,
      note: note ?? null,
      decidedById: userId,
      decidedByRole: role,
    })
  }
  if (contentChanged) await triggerModeration('issue', updated.id)
  if (parentChanged) await triggerModeration('structure', updated.id)

  const hydrated = await db.query.issues.findFirst({
    where: eq(issues.id, updated.id),
    with: issueWithRelations,
  })
  return { applied: true, node: transformIssue(hydrated!) }
}

export async function updateIssueAs(userId: string, input: Omit<UpdateIssueInput, 'solutionStatus'> & { note?: string | null }) {
  return updateNode(userId, input, 'issue')
}

export async function updateSolutionAs(userId: string, input: UpdateIssueInput & { note?: string | null }) {
  return updateNode(userId, input, 'solution')
}

// Map an UpdateIssueInput (latitude/longitude pair) onto the snapshot-keyed
// `changes` map proposeRevision expects (location collapses to {latitude,
// longitude}, merging with the current value so a one-axis edit keeps the
// other). Only fields the caller actually supplied are forwarded.
function issueChangesFromInput(fields: Omit<UpdateIssueInput, 'id'>, base: Snapshot): Snapshot {
  const changes: Snapshot = {}
  if (fields.title !== undefined) changes.title = fields.title
  if (fields.summary !== undefined) changes.summary = fields.summary
  if (fields.description !== undefined) changes.description = fields.description ?? null
  if (fields.solutionStatus !== undefined) changes.solutionStatus = fields.solutionStatus ?? null
  if (fields.locationName !== undefined) changes.locationName = fields.locationName ?? null
  if (fields.scale !== undefined) changes.scale = fields.scale ?? null
  if (fields.links !== undefined) changes.links = fields.links ?? null
  if (fields.parentId !== undefined) changes.parentId = fields.parentId ?? null
  if (fields.latitude !== undefined || fields.longitude !== undefined) {
    const baseLoc = base.location as { latitude: number, longitude: number } | null
    const lat = fields.latitude ?? baseLoc?.latitude ?? null
    const lng = fields.longitude ?? baseLoc?.longitude ?? null
    changes.location = (lat != null && lng != null) ? { latitude: lat, longitude: lng } : null
  }
  return changes
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

export async function updateCaseStudyAs(userId: string, input: UpdateCaseStudyInput & { note?: string | null }): Promise<AppliedCaseStudy | ProposedRevision> {
  const db = useDB()
  const { note, ...patch } = input
  const node = await db.query.caseStudies.findFirst({ where: eq(caseStudies.id, patch.id) })
  if (!node) throw createError({ statusCode: 404, statusMessage: `Case study ${patch.id} not found` })

  const isAdmin = await getIsAdmin(userId)
  const role = await resolveDecideRole(userId, 'case_study', node.id, isAdmin)

  // Non-owner / non-admin: record a pending proposal instead of mutating. The
  // admin-only `verified` flag is never proposable, so it's dropped here.
  if (!role) {
    const { id, verified: _verified, ...fields } = patch
    const changes = caseStudyChangesFromInput(fields, editableCaseStudySnapshot(node))
    const revision = await proposeRevision(userId, { targetKind: 'case_study', targetId: id, changes, note: note ?? null })
    return { applied: false, revision: serializeRevision(revision) }
  }

  // Owner/admin: apply immediately, then record a born-approved revision.
  // updateCaseStudy self-triggers re-moderation on content change.
  const { caseStudy: updated, before } = await updateCaseStudy(userId, patch)
  const after = editableCaseStudySnapshot(updated)
  const changes = diffSnapshots(before, after)
  if (Object.keys(changes).length > 0) {
    await recordRevision({
      targetKind: 'case_study',
      issueId: null,
      caseStudyId: updated.id,
      proposerId: userId,
      status: 'approved',
      changes,
      baseSnapshot: before,
      appliedSnapshot: after,
      note: note ?? null,
      decidedById: userId,
      decidedByRole: role,
    })
  }
  return { applied: true, caseStudy: (await hydrateCaseStudy(updated.id))! }
}

// Map an UpdateCaseStudyInput onto the snapshot-keyed `changes` map. Every
// editable field forwards as-is; latitude/longitude collapse to the snapshot's
// `location: {latitude, longitude}` shape (merging with the current value).
function caseStudyChangesFromInput(fields: Omit<UpdateCaseStudyInput, 'id' | 'verified'>, base: Snapshot): Snapshot {
  const changes: Snapshot = {}
  const body = fields as Record<string, unknown>
  for (const key of Object.keys(base)) {
    if (key === 'location') continue
    if (key in body) changes[key] = body[key]
  }
  if ('latitude' in body || 'longitude' in body) {
    const baseLoc = base.location as { latitude: number, longitude: number } | null
    const lat = (body.latitude as number | null | undefined) ?? baseLoc?.latitude ?? null
    const lng = (body.longitude as number | null | undefined) ?? baseLoc?.longitude ?? null
    changes.location = (lat != null && lng != null) ? { latitude: lat, longitude: lng } : null
  }
  return changes
}

// ---------------------------------------------------------------------------
// Revisions (propose / list / review) — the collaborative-edit layer over MCP.
// All three route through server/utils/revision-write.ts, so the same
// owner/admin-apply-vs-propose routing, visibility rules, and version-history
// ledger as the REST endpoints apply. There is no H3 event on the MCP path, so
// `proposeRevision`/`decideRevision` are called without one — the owner/proposer
// emails degrade to skipped (best-effort), exactly like the dev `triggerModeration`.
// ---------------------------------------------------------------------------

// `kind` over MCP distinguishes issue/solution/case_study; both issues and
// solutions live in the `issues` table, so they map to the 'issue' target kind.
type ProposeEditKind = 'issue' | 'solution' | 'case_study'

/**
 * Propose (or, for the owner/admin, directly apply) an edit to any node. Routes
 * through the same logic as `update_issue`/`update_solution`/`update_case_study`
 * — owner/admin → applied born-approved revision; anyone else → pending proposal.
 */
export async function proposeEditAs(
  userId: string,
  input: { kind: ProposeEditKind, id: number, note?: string | null } & Record<string, unknown>,
): Promise<AppliedNode | ProposedNode | AppliedCaseStudy | ProposedRevision> {
  const { kind, id, note, ...fields } = input
  if (kind === 'case_study') {
    return updateCaseStudyAs(userId, { id, note, ...(fields as Omit<UpdateCaseStudyInput, 'id'>) })
  }
  const expectedType: IssueType = kind === 'solution' ? 'solution' : 'issue'
  return updateNode(userId, { id, note, ...(fields as Omit<UpdateIssueInput, 'id'>) }, expectedType)
}

/**
 * Version history + viewer-visible proposals for a node. Approved revisions are
 * public; pending/rejected/withdrawn/superseded are visible only to the node
 * owner, an admin, or the proposer (same visibility rules as the REST list).
 * `kind` selects the table; `id` is the issue/solution or case-study id.
 */
export async function listRevisionsFor(
  userId: string,
  input: { kind: ProposeEditKind, id: number },
): Promise<{ status: 'ok', revisions: ReturnType<typeof serializeRevision>[] } | { status: 'not_found' }> {
  const db = useDB()
  const targetKind: RevisionTargetKind = input.kind === 'case_study' ? 'case_study' : 'issue'

  if (targetKind === 'issue') {
    const node = await db.query.issues.findFirst({ where: eq(issues.id, input.id), columns: { id: true } })
    if (!node) return { status: 'not_found' }
  }
  else {
    const node = await db.query.caseStudies.findFirst({ where: eq(caseStudies.id, input.id), columns: { id: true } })
    if (!node) return { status: 'not_found' }
  }

  const isAdmin = await getIsAdmin(userId)
  const viewerIsOwner = await isNodeOwner(userId, targetKind, input.id)
  const rows = await db.query.revisions.findMany({
    where: targetKind === 'issue' ? eq(revisions.issueId, input.id) : eq(revisions.caseStudyId, input.id),
    with: {
      proposer: { columns: { id: true, name: true } },
      decidedBy: { columns: { id: true, name: true } },
    },
    orderBy: desc(revisions.createdAt),
  })

  return {
    status: 'ok',
    revisions: rows
      .filter(r => canViewRevision(r, viewerIsOwner, userId, isAdmin))
      .map(serializeRevision),
  }
}

/**
 * Owner/admin approves or rejects a pending proposal. Permission (owner/admin),
 * the 404/409 guards, the apply-on-approve, and trust-score recompute all live
 * in `decideRevision`. No event is passed, so the proposer email is skipped.
 */
export async function reviewRevisionAs(
  userId: string,
  input: { revisionId: number, action: DecideAction, reason?: string | null },
) {
  const updated = await decideRevision(userId, input.revisionId, input.action, input.reason ?? null)
  return updated ? serializeRevision(updated) : null
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
    where: and(inArray(caseStudies.solutionId, solutionIds), eq(caseStudies.status, 'approved')),
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

  const rankedList = await findSimilar<{ id: number, similarity: number }>({
    table: 'issues',
    columns: 'id',
    embedding: seed.embedding as number[],
    where: sql`status = 'approved' AND id <> ${seedId}`,
    limit,
  })
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

  const above = await findSimilar<{ id: number, similarity: number }>({
    table: 'tags',
    columns: 'id',
    embedding,
    limit,
    threshold: TAG_SIMILARITY_THRESHOLD,
  })
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
