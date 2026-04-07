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

  // Rejected issues: only visible to the author (and never if spam)
  if (result.status === 'rejected') {
    if (result.isSpam) return null
    if (!session.user || session.user.id !== result.authorId) return null
  }

  // Only expose moderation fields to the author. Anonymous viewers never
  // see appealStatus, isSpam, rejectionReason, etc., even on pending issues.
  const isAuthor = session.user?.id === result.authorId
  return transformIssue(result, { includeModeration: isAuthor })
})
