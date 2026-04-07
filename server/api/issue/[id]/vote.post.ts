import { eq, sql } from 'drizzle-orm'
import { issues, users, votes } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  await assertNotBanned(session.user.id)

  const issueId = getRouterParam(event, 'id')
  if (!issueId || isNaN(parseInt(issueId, 10))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid issue ID' })
  }

  const body = await readBody<{ value?: number }>(event)
  if (body.value !== 1 && body.value !== -1) {
    throw createError({ statusCode: 400, statusMessage: 'Vote value must be 1 or -1' })
  }

  const db = useDB()
  const id = parseInt(issueId, 10)

  // Verify issue exists and is not rejected
  const issue = await db.query.issues.findFirst({
    where: eq(issues.id, id),
    columns: { id: true, status: true },
  })
  if (!issue || issue.status === 'rejected') {
    throw createError({ statusCode: 404, statusMessage: 'Issue not found' })
  }

  // Derive vote weight from voter's trust score
  const voter = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { trustScore: true },
  })
  const weight = trustScoreToVoteWeight(voter?.trustScore ?? 0)

  await db.transaction(async (tx) => {
    // Upsert vote with weight
    await tx.insert(votes).values({
      userId: session.user.id,
      issueId: id,
      value: body.value!,
      weight,
    }).onConflictDoUpdate({
      target: [votes.userId, votes.issueId],
      set: { value: body.value!, weight, updatedAt: new Date() },
    })

    // Recalculate cached score using weighted votes
    await tx.update(issues)
      .set({ voteScore: sql`(SELECT COALESCE(SUM(value * weight), 0) FROM votes WHERE issue_id = ${id})` })
      .where(eq(issues.id, id))
  })

  // Fetch updated score
  const updated = await db.query.issues.findFirst({
    where: eq(issues.id, id),
    columns: { voteScore: true, authorId: true },
  })

  // Recalculate issue author's trust score
  if (updated?.authorId) {
    updateUserTrustScore(updated.authorId).catch(console.error)
  }

  return { score: updated?.voteScore ?? 0, userVote: body.value }
})
