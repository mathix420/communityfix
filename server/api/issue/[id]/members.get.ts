// Owners + collaborators of an issue/solution, plus whether the viewer may
// manage them. Public list (avatars are already public on cards); the `viewer`
// block gates the management controls.
import { eq } from 'drizzle-orm'
import { issues } from '../../../database/schema'
import { membersWithViewer } from '../../../utils/node-members'
import { getIsAdmin } from '../../../utils/is-admin'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id || isNaN(parseInt(id, 10))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid issue ID' })
  }
  const issueId = parseInt(id, 10)

  const node = await useDB().query.issues.findFirst({
    where: eq(issues.id, issueId),
    columns: { id: true },
  })
  if (!node) throw createError({ statusCode: 404, statusMessage: `Issue ${issueId} not found` })

  const session = await getUserSession(event)
  const viewerId = session.user?.id ?? null
  const isAdmin = await getIsAdmin(viewerId)
  return membersWithViewer('issue', issueId, viewerId, isAdmin)
})
