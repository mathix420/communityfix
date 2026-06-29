// Version history for a case study. Approved revisions are public; pending,
// rejected, withdrawn, and superseded ones are visible only to the node owner,
// an admin, or the proposer (visibility decision #3 in the plan).
import { eq, desc } from 'drizzle-orm'
import { caseStudies, revisions } from '../../../database/schema'
import { canViewRevision, serializeRevision } from '../../../utils/revision-write'
import { getIsAdmin } from '../../../utils/is-admin'
import { isNodeOwner } from '../../../utils/node-members'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id || isNaN(parseInt(id, 10))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid case study ID' })
  }
  const caseStudyId = parseInt(id, 10)

  const db = useDB()
  const node = await db.query.caseStudies.findFirst({
    where: eq(caseStudies.id, caseStudyId),
    columns: { id: true, authorId: true },
  })
  if (!node) {
    throw createError({ statusCode: 404, statusMessage: `Case study ${caseStudyId} not found` })
  }

  const session = await getUserSession(event)
  const viewerId = session.user?.id ?? null
  const isAdmin = await getIsAdmin(viewerId)
  const viewerIsOwner = viewerId ? await isNodeOwner(viewerId, 'case_study', caseStudyId) : false

  const rows = await db.query.revisions.findMany({
    where: eq(revisions.caseStudyId, caseStudyId),
    with: {
      proposer: { columns: { id: true, name: true } },
      decidedBy: { columns: { id: true, name: true } },
    },
    orderBy: desc(revisions.createdAt),
  })

  return rows
    .filter(r => canViewRevision(r, viewerIsOwner, viewerId, isAdmin))
    .map(serializeRevision)
})
