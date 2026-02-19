import { eq } from 'drizzle-orm'
import { issues } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const issueId = getRouterParam(event, 'id')
  if (!issueId || isNaN(parseInt(issueId, 10))) return null

  const result = await db.query.issues.findFirst({
    where: eq(issues.id, parseInt(issueId, 10)),
    with: {
      issueTags: { with: { tag: true } },
      issueSdgs: { with: { sdg: true } },
    },
  })

  if (!result) return null

  // Rejected issues: only visible to the author (and never if spam)
  if (result.status === 'rejected') {
    if (result.isSpam) return null
    const session = await getUserSession(event)
    if (!session.user || session.user.id !== result.authorId) return null
  }

  return transformIssue(result)
})
