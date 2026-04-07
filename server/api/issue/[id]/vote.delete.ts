import { eq, and, sql } from 'drizzle-orm'
import { issues, votes } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  const issueId = getRouterParam(event, 'id')
  if (!issueId || isNaN(parseInt(issueId, 10))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid issue ID' })
  }

  const db = useDB()
  const id = parseInt(issueId, 10)

  await db.transaction(async (tx) => {
    await tx.delete(votes).where(
      and(eq(votes.userId, session.user.id), eq(votes.issueId, id)),
    )

    await tx.update(issues)
      .set({ voteScore: sql`(SELECT COALESCE(SUM(value * weight), 0) FROM votes WHERE issue_id = ${id})` })
      .where(eq(issues.id, id))
  })

  const updated = await db.query.issues.findFirst({
    where: eq(issues.id, id),
    columns: { voteScore: true, authorId: true },
  })

  // Recalculate issue author's trust score
  if (updated?.authorId) {
    updateUserTrustScore(updated.authorId).catch(console.error)
  }

  return { score: updated?.voteScore ?? 0, userVote: null }
})
