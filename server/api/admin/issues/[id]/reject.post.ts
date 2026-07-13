import { eq } from 'drizzle-orm'
import { issues } from '../../../../database/schema'
import { createAuditLog } from '../../../../utils/audit-log'

export default defineEventHandler(async (event) => {
  const { session, db, id } = await requireEventContext(event)
  const body = await readBody<{ reason: string }>(event)

  if (!body.reason) {
    throw createError({ statusCode: 400, message: 'Rejection reason is required' })
  }

  const issue = await loadIssueOr404(id)
  if (issue.status === 'rejected') {
    throw createError({ statusCode: 400, message: 'Issue is already rejected' })
  }

  if (issue.status === 'approved') {
    await adjustParentCounter(db, issue, -1)
  }

  await db
    .update(issues)
    .set({
      status: 'rejected',
      rejectionReason: body.reason,
      rejectedAt: new Date(),
      appealStatus: null,
      appealReason: null,
      appealedAt: null,
    })
    .where(eq(issues.id, id))

  await createAuditLog({
    type: 'admin_override',
    action: 'override_reject',
    issueId: id,
    userId: issue.authorId,
    reason: body.reason,
    details: { adminId: session.user.id, previousStatus: issue.status },
  })

  if (issue.authorId) {
    await updateUserTrustScore(issue.authorId)
  }

  return { success: true }
})
