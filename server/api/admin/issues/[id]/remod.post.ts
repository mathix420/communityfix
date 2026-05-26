import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { issues, issueTags, issueSdgs } from '../../../../database/schema'
import { createAuditLog } from '../../../../utils/audit-log'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDB()
  const id = Number(getRouterParam(event, 'id'))

  const issue = await db.query.issues.findFirst({ where: eq(issues.id, id) })
  if (!issue) {
    throw createError({ statusCode: 404, message: 'Issue not found' })
  }
  if (issue.status === 'pending') {
    throw createError({ statusCode: 400, message: 'Issue is already pending moderation' })
  }

  const previousStatus = issue.status

  if (previousStatus === 'rejected' && issue.parentId) {
    const counter = issue.type === 'solution'
      ? { solutionCount: sql`${issues.solutionCount} + 1` }
      : { subIssueCount: sql`${issues.subIssueCount} + 1` }
    await db.update(issues)
      .set(counter)
      .where(eq(issues.id, issue.parentId))
  }

  await db.delete(issueTags).where(eq(issueTags.issueId, id))
  await db.delete(issueSdgs).where(eq(issueSdgs.issueId, id))

  await db.update(issues)
    .set({
      status: 'pending',
      rejectionReason: null,
      rejectedAt: null,
      isSpam: false,
      appealStatus: null,
      appealReason: null,
      appealedAt: null,
      embedding: null,
    })
    .where(eq(issues.id, id))

  await createAuditLog({
    type: 'admin_override',
    action: 'override_approve',
    status: 'auto_resolved',
    issueId: id,
    userId: issue.authorId,
    reason: `Admin triggered re-moderation (was ${previousStatus})`,
    details: { adminId: session.user.id, previousStatus, remod: true },
  })

  const reviewPromise = runTask('review:issue', { payload: { issueId: id } })
    .catch(err => console.error(`[remod] Background review failed for issue ${id}:`, err))

  ;(event.context as { cloudflare?: { context?: { waitUntil?: (p: Promise<unknown>) => void } } })
    .cloudflare?.context?.waitUntil?.(reviewPromise)

  return { success: true }
})
