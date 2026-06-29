// Promote/demote a member on a case study. Owner/admin only; can't strip the
// last owner. Mirrors /api/issue/[id]/members.
import { eq } from 'drizzle-orm'
import { caseStudies, NODE_MEMBER_ROLES } from '../../../database/schema'
import type { NodeMemberRole } from '../../../database/schema'
import { changeMemberRole, membersWithViewer } from '../../../utils/node-members'
import { isSessionAdmin } from '../../../utils/is-admin'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const id = getRouterParam(event, 'id')
  if (!id || isNaN(parseInt(id, 10))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid case study ID' })
  }
  const caseStudyId = parseInt(id, 10)

  const body = await readBody<{ userId?: string, role?: string }>(event)
  if (!body?.userId || !body.role || !NODE_MEMBER_ROLES.includes(body.role as NodeMemberRole)) {
    throw createError({ statusCode: 400, statusMessage: 'userId and a valid role are required' })
  }

  const node = await useDB().query.caseStudies.findFirst({ where: eq(caseStudies.id, caseStudyId), columns: { id: true } })
  if (!node) throw createError({ statusCode: 404, statusMessage: `Case study ${caseStudyId} not found` })

  const isAdmin = await isSessionAdmin(event)
  await changeMemberRole({
    kind: 'case_study',
    nodeId: caseStudyId,
    actingUserId: session.user.id,
    isAdmin,
    targetUserId: body.userId,
    role: body.role as NodeMemberRole,
  })

  return membersWithViewer('case_study', caseStudyId, session.user.id, isAdmin)
})
