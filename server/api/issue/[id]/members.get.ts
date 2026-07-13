// Owners + collaborators of an issue/solution, plus whether the viewer may
// manage them. Public list (avatars are already public on cards); the `viewer`
// block gates the management controls.
import { membersWithViewer } from '../../../utils/node-members'
import { getIsAdmin } from '../../../utils/is-admin'

export default defineEventHandler(async (event) => {
  const issueId = requireIdParam(event)
  await assertIssueExists(issueId)

  const session = await getUserSession(event)
  const viewerId = session.user?.id ?? null
  const isAdmin = await getIsAdmin(viewerId)
  return membersWithViewer('issue', issueId, viewerId, isAdmin)
})
