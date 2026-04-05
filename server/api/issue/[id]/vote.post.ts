import { eq, and, sql } from 'drizzle-orm'
import { issues, votes } from '../../../database/schema'

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

  await db.transaction(async (tx) => {
    // Upsert vote
    await tx.insert(votes).values({
      userId: session.user.id,
      issueId: id,
      value: body.value!,
    }).onConflictDoUpdate({
      target: [votes.userId, votes.issueId],
      set: { value: body.value!, updatedAt: new Date() },
    })

    // Recalculate cached score
    await tx.update(issues)
      .set({ voteScore: sql`(SELECT COALESCE(SUM(value), 0) FROM votes WHERE issue_id = ${id})` })
      .where(eq(issues.id, id))
  })

  // Fetch updated score
  const updated = await db.query.issues.findFirst({
    where: eq(issues.id, id),
    columns: { voteScore: true },
  })

  return { score: updated?.voteScore ?? 0, userVote: body.value }
})
