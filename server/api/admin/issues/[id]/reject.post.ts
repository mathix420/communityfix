import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { issues } from '../../../../database/schema'
import { createAuditLog } from '../../../../utils/audit-log'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDB()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<{ reason: string }>(event)

  if (!body.reason) {
    throw createError({ statusCode: 400, message: 'Rejection reason is required' })
  }

  const issue = await db.query.issues.findFirst({ where: eq(issues.id, id) })
  if (!issue) {
    throw createError({ statusCode: 404, message: 'Issue not found' })
  }
  if (issue.status === 'rejected') {
    throw createError({ statusCode: 400, message: 'Issue is already rejected' })
  }

  if (issue.parentId && issue.status === 'approved') {
    const counter = issue.type === 'solution'
      ? { solutionCount: sql`GREATEST(${issues.solutionCount} - 1, 0)` }
      : { subIssueCount: sql`GREATEST(${issues.subIssueCount} - 1, 0)` }
    await db.update(issues)
      .set(counter)
      .where(eq(issues.id, issue.parentId))
  }

  await db.update(issues)
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
