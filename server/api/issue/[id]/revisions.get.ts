// Version history for an issue/solution. Approved revisions are public; pending,
// rejected, withdrawn, and superseded ones are visible only to the node owner,
// an admin, or the proposer (visibility decision #3 in the plan).
import { eq, desc } from 'drizzle-orm'
import { revisions } from '../../../database/schema'
import { canViewRevision, serializeRevision } from '../../../utils/revision-write'
import { getIsAdmin } from '../../../utils/is-admin'
import { isNodeOwner } from '../../../utils/node-members'

export default defineEventHandler(async (event) => {
  const issueId = requireIdParam(event)
  await assertIssueExists(issueId)

  const db = useDB()

  const session = await getUserSession(event)
  const viewerId = session.user?.id ?? null
  const isAdmin = await getIsAdmin(viewerId)
  const viewerIsOwner = viewerId ? await isNodeOwner(viewerId, 'issue', issueId) : false

  const rows = await db.query.revisions.findMany({
    where: eq(revisions.issueId, issueId),
    with: {
      proposer: { columns: { id: true, name: true } },
      decidedBy: { columns: { id: true, name: true } },
    },
    orderBy: desc(revisions.createdAt),
  })

  return rows
    .filter((r) => canViewRevision(r, viewerIsOwner, viewerId, isAdmin))
    .map(serializeRevision)
})
