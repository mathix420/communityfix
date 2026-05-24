import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { issues, auditLogs } from '../../../../database/schema'
import { createAuditLog } from '../../../../utils/audit-log'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDB()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<{ reason?: string }>(event)

  const issue = await db.query.issues.findFirst({ where: eq(issues.id, id) })
  if (!issue) {
    throw createError({ statusCode: 404, message: 'Issue not found' })
  }
  if (issue.status === 'approved') {
    throw createError({ statusCode: 400, message: 'Issue is already approved' })
  }

  await db.update(issues)
    .set({
      status: 'approved',
      rejectionReason: null,
      rejectedAt: null,
      isSpam: false,
      appealStatus: null,
      appealReason: null,
      appealedAt: null,
    })
    .where(eq(issues.id, id))

  if (issue.parentId) {
    const counter = issue.type === 'solution'
      ? { solutionCount: sql`${issues.solutionCount} + 1` }
      : { subIssueCount: sql`${issues.subIssueCount} + 1` }
    await db.update(issues)
      .set(counter)
      .where(eq(issues.id, issue.parentId))
  }

  await createAuditLog({
    type: 'admin_override',
    action: 'override_approve',
    issueId: id,
    userId: issue.authorId,
    reason: body.reason || 'Admin force-approved',
    details: { adminId: session.user.id, previousStatus: issue.status },
  })

  await db.update(auditLogs)
    .set({
      status: 'overridden',
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      reviewNote: body.reason || null,
    })
    .where(and(eq(auditLogs.issueId, id), eq(auditLogs.status, 'needs_review')))

  if (issue.authorId) {
    await updateUserTrustScore(issue.authorId)
  }

  runTask('review:structure', { payload: { issueId: id } }).catch(() => {})

  return { success: true }
})
