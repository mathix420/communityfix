import { eq } from 'drizzle-orm'
import { issues } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const issueId = getRouterParam(event, 'id')
  if (!issueId || isNaN(parseInt(issueId, 10))) return null

  const result = await db.query.issues.findFirst({
    where: eq(issues.id, parseInt(issueId, 10)),
    with: issueWithRelations,
  })

  if (!result) return null

  const session = await getUserSession(event)
  const viewerId = session.user?.id ?? null
  // Ownership now lives in node_members (the creator is seeded as an owner).
  const viewerIsOwner = viewerId ? await isNodeOwner(viewerId, 'issue', result.id) : false

  // Rejected issues: only visible to an owner (and never if spam)
  if (result.status === 'rejected') {
    if (result.isSpam) return null
    if (!viewerIsOwner) return null
  }

  // Only expose moderation fields to an owner. Anonymous/other viewers never
  // see appealStatus, isSpam, rejectionReason, etc., even on pending issues.
  return { ...transformIssue(result, { includeModeration: viewerIsOwner }), viewerIsOwner }
})
