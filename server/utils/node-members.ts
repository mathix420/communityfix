// Membership layer: who is attached to a node (issue/solution or case study)
// and what they may do. This replaces the legacy single-`authorId` permission
// model — a node can have many owners (edit + decide rights) and many
// collaborators (credit only). `authorId` remains on the node purely as creator
// provenance. See `node_members` in schema.ts.
import { and, eq, inArray, sql } from 'drizzle-orm'
import { nodeMembers, revisions, users } from '../database/schema'
import type {
  RevisionTargetKind,
  RevisionDecidedByRole,
  NodeMemberRole,
  NodeMemberSource,
} from '../database/schema'

// A member as the UI consumes it: the person, their role, and how many approved
// revisions they've landed on the node (orders avatars most-active-first).
export interface Member {
  id: string | null
  name: string
  role: NodeMemberRole
  source: NodeMemberSource | null
  changes: number
}

function nodeIdColumn(kind: RevisionTargetKind) {
  return kind === 'issue' ? nodeMembers.issueId : nodeMembers.caseStudyId
}

/** This user's role on the node, or null if they hold no membership. */
export async function getNodeRole(
  userId: string,
  kind: RevisionTargetKind,
  nodeId: number,
): Promise<NodeMemberRole | null> {
  const db = useDB()
  const col = nodeIdColumn(kind)
  const rows = await db
    .select({ role: nodeMembers.role })
    .from(nodeMembers)
    .where(and(eq(nodeMembers.targetKind, kind), eq(col, nodeId), eq(nodeMembers.userId, userId)))
    .limit(1)
  return rows[0]?.role ?? null
}

/** True when the user is an owner of the node (edit-without-approval rights). */
export async function isNodeOwner(
  userId: string,
  kind: RevisionTargetKind,
  nodeId: number,
): Promise<boolean> {
  return (await getNodeRole(userId, kind, nodeId)) === 'owner'
}

/** Ids of every node of `kind` this user owns — drives the dashboard review queue. */
export async function ownedNodeIds(userId: string, kind: RevisionTargetKind): Promise<number[]> {
  const db = useDB()
  const col = nodeIdColumn(kind)
  const rows = await db
    .select({ nodeId: col })
    .from(nodeMembers)
    .where(
      and(
        eq(nodeMembers.targetKind, kind),
        eq(nodeMembers.userId, userId),
        eq(nodeMembers.role, 'owner'),
      ),
    )
  return rows.map((r) => r.nodeId).filter((v): v is number => v != null)
}

/**
 * Owners of a node with contact details, for notifications. Ownership lives here
 * now (not the legacy single authorId), so a node can have several owners and
 * every one should hear about a new proposal. Filter the proposer out at the
 * call site.
 */
export async function nodeOwnerContacts(
  kind: RevisionTargetKind,
  nodeId: number,
): Promise<{ id: string; email: string | null; name: string | null }[]> {
  const db = useDB()
  const col = nodeIdColumn(kind)
  return db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(nodeMembers)
    .innerJoin(users, eq(users.id, nodeMembers.userId))
    .where(and(eq(nodeMembers.targetKind, kind), eq(col, nodeId), eq(nodeMembers.role, 'owner')))
}

/**
 * Who, if anyone, may accept/reject a proposal on this node: an `owner` of the
 * node or any `admin`. Returns null otherwise. The membership-aware replacement
 * for the old authorId-based `canDecide`.
 */
export async function resolveDecideRole(
  userId: string,
  kind: RevisionTargetKind,
  nodeId: number,
  isAdmin: boolean,
): Promise<RevisionDecidedByRole | null> {
  if (await isNodeOwner(userId, kind, nodeId)) return 'owner'
  if (isAdmin) return 'admin'
  return null
}

/**
 * Add a membership if the user has none on this node yet. Never downgrades an
 * existing owner to collaborator (so crediting an accepted proposal can't strip
 * owner rights). The trailing onConflictDoNothing guards a concurrent insert.
 */
export async function addNodeMember(opts: {
  kind: RevisionTargetKind
  nodeId: number
  userId: string
  role: NodeMemberRole
  source?: NodeMemberSource
}): Promise<void> {
  if (await getNodeRole(opts.userId, opts.kind, opts.nodeId)) return
  const db = useDB()
  await db
    .insert(nodeMembers)
    .values({
      targetKind: opts.kind,
      issueId: opts.kind === 'issue' ? opts.nodeId : null,
      caseStudyId: opts.kind === 'case_study' ? opts.nodeId : null,
      userId: opts.userId,
      role: opts.role,
      source: opts.source ?? null,
    })
    .onConflictDoNothing()
}

/**
 * Promote/demote (or create) a membership at an explicit role. Used by the
 * owner/admin member-management endpoints.
 */
export async function setNodeMemberRole(opts: {
  kind: RevisionTargetKind
  nodeId: number
  userId: string
  role: NodeMemberRole
  source?: NodeMemberSource
}): Promise<void> {
  const db = useDB()
  const col = nodeIdColumn(opts.kind)
  const existing = await getNodeRole(opts.userId, opts.kind, opts.nodeId)
  if (existing == null) {
    await addNodeMember(opts)
    return
  }
  await db
    .update(nodeMembers)
    .set({
      role: opts.role,
      ...(opts.source !== undefined ? { source: opts.source } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(nodeMembers.targetKind, opts.kind),
        eq(col, opts.nodeId),
        eq(nodeMembers.userId, opts.userId),
      ),
    )
}

/** Count of owners on a node — lets callers refuse to remove the last one. */
export async function ownerCount(kind: RevisionTargetKind, nodeId: number): Promise<number> {
  const db = useDB()
  const col = nodeIdColumn(kind)
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(nodeMembers)
    .where(and(eq(nodeMembers.targetKind, kind), eq(col, nodeId), eq(nodeMembers.role, 'owner')))
  return Number(rows[0]?.n ?? 0)
}

/**
 * Owners + collaborators for a batch of nodes, each with their approved-revision
 * count for ordering. Two grouped queries regardless of batch size, so it's safe
 * on list endpoints. Nodes absent from the map simply have no members yet.
 */
export async function membersForNodes(
  kind: RevisionTargetKind,
  ids: number[],
): Promise<Map<number, { owners: Member[]; collaborators: Member[] }>> {
  const out = new Map<number, { owners: Member[]; collaborators: Member[] }>()
  if (ids.length === 0) return out

  const db = useDB()
  const memberCol = nodeIdColumn(kind)
  const revCol = kind === 'issue' ? revisions.issueId : revisions.caseStudyId

  const [memberRows, countRows] = await Promise.all([
    db
      .select({
        nodeId: memberCol,
        userId: nodeMembers.userId,
        name: users.name,
        role: nodeMembers.role,
        source: nodeMembers.source,
      })
      .from(nodeMembers)
      .innerJoin(users, eq(users.id, nodeMembers.userId))
      .where(and(eq(nodeMembers.targetKind, kind), inArray(memberCol, ids))),
    db
      .select({
        nodeId: revCol,
        userId: revisions.proposerId,
        n: sql<number>`count(*)::int`,
      })
      .from(revisions)
      .where(
        and(eq(revisions.targetKind, kind), eq(revisions.status, 'approved'), inArray(revCol, ids)),
      )
      .groupBy(revCol, revisions.proposerId),
  ])

  const countMap = new Map<string, number>()
  for (const c of countRows) {
    if (c.nodeId != null && c.userId != null) countMap.set(`${c.nodeId}:${c.userId}`, Number(c.n))
  }

  for (const m of memberRows) {
    if (m.nodeId == null) continue
    const entry = out.get(m.nodeId) ?? { owners: [], collaborators: [] }
    const member: Member = {
      id: m.userId,
      name: m.name ?? 'Anonymous',
      role: m.role,
      source: m.source,
      changes: countMap.get(`${m.nodeId}:${m.userId}`) ?? 0,
    }
    if (m.role === 'owner') entry.owners.push(member)
    else entry.collaborators.push(member)
    out.set(m.nodeId, entry)
  }

  const byChanges = (a: Member, b: Member) => b.changes - a.changes
  for (const e of out.values()) {
    e.owners.sort(byChanges)
    e.collaborators.sort(byChanges)
  }
  return out
}

/** Single-node members for the detail-page panel. */
export async function nodeMembersList(
  kind: RevisionTargetKind,
  nodeId: number,
): Promise<{ owners: Member[]; collaborators: Member[] }> {
  const byNode = await membersForNodes(kind, [nodeId])
  return byNode.get(nodeId) ?? { owners: [], collaborators: [] }
}

/** Members + the viewer's management capability — backs the members panel. */
export async function membersWithViewer(
  kind: RevisionTargetKind,
  nodeId: number,
  viewerId: string | null,
  isAdmin: boolean,
) {
  const { owners, collaborators } = await nodeMembersList(kind, nodeId)
  const viewerIsOwner = !!viewerId && owners.some((o) => o.id === viewerId)
  return {
    owners,
    collaborators,
    viewer: { canManage: isAdmin || viewerIsOwner, isOwner: viewerIsOwner, isAdmin },
  }
}

/**
 * Promote a collaborator to owner, or demote an owner back to collaborator.
 * Only an existing owner or an admin may do this, the target must already be a
 * member, and a node can never be left with zero owners.
 */
export async function changeMemberRole(opts: {
  kind: RevisionTargetKind
  nodeId: number
  actingUserId: string
  isAdmin: boolean
  targetUserId: string
  role: NodeMemberRole
}): Promise<void> {
  const canManage = opts.isAdmin || (await isNodeOwner(opts.actingUserId, opts.kind, opts.nodeId))
  if (!canManage) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only an owner or an admin can manage members',
    })
  }

  const existing = await getNodeRole(opts.targetUserId, opts.kind, opts.nodeId)
  if (existing == null) {
    throw createError({ statusCode: 404, statusMessage: 'That user is not a member of this node' })
  }
  if (existing === opts.role) return

  if (
    existing === 'owner' &&
    opts.role === 'collaborator' &&
    (await ownerCount(opts.kind, opts.nodeId)) <= 1
  ) {
    throw createError({ statusCode: 409, statusMessage: 'A node must keep at least one owner' })
  }

  await setNodeMemberRole({
    kind: opts.kind,
    nodeId: opts.nodeId,
    userId: opts.targetUserId,
    role: opts.role,
    source: 'granted',
  })
}

/**
 * Attach `owners` + `collaborators` arrays to each already-transformed node for
 * the card avatar stack. Falls back to a synthetic owner from the node's
 * creator (`author`/`authorId`) so a card always shows at least one avatar, even
 * for legacy nodes with no membership rows yet.
 */
export async function withMembers<
  T extends { id: number; authorId?: string | null; author?: string },
>(
  kind: RevisionTargetKind,
  nodes: T[],
): Promise<(T & { owners: Member[]; collaborators: Member[] })[]> {
  const byNode = await membersForNodes(
    kind,
    nodes.map((n) => n.id),
  )
  return nodes.map((n) => {
    const m = byNode.get(n.id)
    const owners = m?.owners.length
      ? m.owners
      : [
          {
            id: n.authorId ?? null,
            name: n.author ?? 'Anonymous',
            role: 'owner' as const,
            source: 'creator' as const,
            changes: 0,
          },
        ]
    return Object.assign(n, { owners, collaborators: m?.collaborators ?? [] })
  })
}
