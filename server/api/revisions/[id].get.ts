// Single revision detail (before/after + diff). Same visibility rules as the
// list endpoints: approved is public; everything else is private to owner,
// admin, or proposer. Also surfaces per-viewer capability flags so the UI can
// show approve/reject/withdraw controls without a second round-trip.
import { eq } from 'drizzle-orm'
import { revisions } from '../../database/schema'
import { canViewRevision, serializeRevision } from '../../utils/revision-write'
import { getIsAdmin } from '../../utils/is-admin'
import { resolveDecideRole, isNodeOwner } from '../../utils/node-members'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id || isNaN(parseInt(id, 10))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid revision ID' })
  }
  const revisionId = parseInt(id, 10)

  const db = useDB()
  const row = await db.query.revisions.findFirst({
    where: eq(revisions.id, revisionId),
    with: {
      proposer: { columns: { id: true, name: true } },
      decidedBy: { columns: { id: true, name: true } },
    },
  })
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: `Revision ${revisionId} not found` })
  }

  // The node this revision targets, for the visibility + decision checks.
  const nodeId = row.targetKind === 'issue' ? row.issueId : row.caseStudyId

  const session = await getUserSession(event)
  const viewerId = session.user?.id ?? null
  const isAdmin = await getIsAdmin(viewerId)
  const viewerIsOwner = viewerId && nodeId != null
    ? await isNodeOwner(viewerId, row.targetKind, nodeId)
    : false

  if (!canViewRevision(row, viewerIsOwner, viewerId, isAdmin)) {
    throw createError({ statusCode: 404, statusMessage: `Revision ${revisionId} not found` })
  }

  const role = viewerId && nodeId != null
    ? await resolveDecideRole(viewerId, row.targetKind, nodeId, isAdmin)
    : null
  const isPending = row.status === 'pending'

  return {
    ...serializeRevision(row),
    viewer: {
      canDecide: isPending && role != null,
      canWithdraw: isPending && (isAdmin || (!!viewerId && row.proposerId === viewerId)),
      role,
    },
  }
})
