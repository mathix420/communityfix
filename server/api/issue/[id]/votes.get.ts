import { eq, and } from 'drizzle-orm'
import { issues, votes } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const issueId = getRouterParam(event, 'id')
  if (!issueId || isNaN(parseInt(issueId, 10))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid issue ID' })
  }

  const db = useDB()
  const id = parseInt(issueId, 10)

  const issue = await db.query.issues.findFirst({
    where: eq(issues.id, id),
    columns: { voteScore: true },
  })
  if (!issue) {
    throw createError({ statusCode: 404, statusMessage: 'Issue not found' })
  }

  let userVote: number | null = null
  const session = await getUserSession(event)
  if (session.user) {
    const vote = await db.query.votes.findFirst({
      where: and(eq(votes.userId, session.user.id), eq(votes.issueId, id)),
      columns: { value: true },
    })
    userVote = vote?.value ?? null
  }

  return { score: issue.voteScore, userVote }
})
