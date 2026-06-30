import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { issues } from '../../../../database/schema'
import { createAuditLog } from '../../../../utils/audit-log'
import { triggerModeration } from '../../../../utils/moderation-trigger'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDB()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<{ status: 'approved' | 'denied'; reason?: string }>(event)

  if (!['approved', 'denied'].includes(body.status)) {
    throw createError({ statusCode: 400, message: 'Status must be "approved" or "denied"' })
  }

  const issue = await db.query.issues.findFirst({ where: eq(issues.id, id) })
  if (!issue || issue.appealStatus !== 'pending') {
    throw createError({ statusCode: 404, message: 'No pending appeal for this issue' })
  }

  if (body.status === 'approved') {
    await db
      .update(issues)
      .set({
        status: 'approved',
        rejectionReason: null,
        rejectedAt: null,
        isSpam: false,
        appealStatus: 'approved',
      })
      .where(eq(issues.id, id))

    if (issue.parentId) {
      const counter =
        issue.type === 'solution'
          ? { solutionCount: sql`${issues.solutionCount} + 1` }
          : { subIssueCount: sql`${issues.subIssueCount} + 1` }
      await db.update(issues).set(counter).where(eq(issues.id, issue.parentId))
    }

    await triggerModeration('structure', id)
  } else {
    await db.update(issues).set({ appealStatus: 'denied' }).where(eq(issues.id, id))
  }

  await createAuditLog({
    type: 'appeal',
    action: body.status === 'approved' ? 'appeal_approved' : 'appeal_denied',
    issueId: id,
    userId: issue.authorId,
    reason: body.reason || `Appeal ${body.status} by admin`,
    details: { adminId: session.user.id },
  })

  if (issue.authorId) {
    await updateUserTrustScore(issue.authorId)
  }

  return { success: true }
})
