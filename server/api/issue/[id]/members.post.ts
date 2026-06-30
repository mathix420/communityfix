// Promote a collaborator to owner (or demote an owner to collaborator) on an
// issue/solution. Owner/admin only; can't strip the last owner. See
// changeMemberRole for the rules.
import { eq } from 'drizzle-orm'
import { issues, NODE_MEMBER_ROLES } from '../../../database/schema'
import type { NodeMemberRole } from '../../../database/schema'
import { changeMemberRole, membersWithViewer } from '../../../utils/node-members'
import { isSessionAdmin } from '../../../utils/is-admin'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const id = getRouterParam(event, 'id')
  if (!id || isNaN(parseInt(id, 10))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid issue ID' })
  }
  const issueId = parseInt(id, 10)

  const body = await readBody<{ userId?: string; role?: string }>(event)
  if (!body?.userId || !body.role || !NODE_MEMBER_ROLES.includes(body.role as NodeMemberRole)) {
    throw createError({ statusCode: 400, statusMessage: 'userId and a valid role are required' })
  }

  const node = await useDB().query.issues.findFirst({
    where: eq(issues.id, issueId),
    columns: { id: true },
  })
  if (!node) throw createError({ statusCode: 404, statusMessage: `Issue ${issueId} not found` })

  const isAdmin = await isSessionAdmin(event)
  await changeMemberRole({
    kind: 'issue',
    nodeId: issueId,
    actingUserId: session.user.id,
    isAdmin,
    targetUserId: body.userId,
    role: body.role as NodeMemberRole,
  })

  return membersWithViewer('issue', issueId, session.user.id, isAdmin)
})
