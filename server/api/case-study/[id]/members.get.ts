// Owners + collaborators of a case study, plus the viewer's management
// capability. Mirrors /api/issue/[id]/members.
import { eq } from 'drizzle-orm'
import { caseStudies } from '../../../database/schema'
import { membersWithViewer } from '../../../utils/node-members'
import { getIsAdmin } from '../../../utils/is-admin'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id || isNaN(parseInt(id, 10))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid case study ID' })
  }
  const caseStudyId = parseInt(id, 10)

  const node = await useDB().query.caseStudies.findFirst({ where: eq(caseStudies.id, caseStudyId), columns: { id: true } })
  if (!node) throw createError({ statusCode: 404, statusMessage: `Case study ${caseStudyId} not found` })

  const session = await getUserSession(event)
  const viewerId = session.user?.id ?? null
  const isAdmin = await getIsAdmin(viewerId)
  return membersWithViewer('case_study', caseStudyId, viewerId, isAdmin)
})
