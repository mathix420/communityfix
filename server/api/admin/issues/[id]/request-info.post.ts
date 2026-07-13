import { eq } from 'drizzle-orm'
import { issues } from '../../../../database/schema'
import { createAuditLog } from '../../../../utils/audit-log'

export default defineEventHandler(async (event) => {
  const { session, db, id } = await requireEventContext(event)
  const body = await readBody<{ question: string }>(event)

  if (!body.question?.trim()) {
    throw createError({ statusCode: 400, message: 'Question is required' })
  }

  const issue = await loadIssueOr404(id)
  if (issue.status !== 'pending') {
    throw createError({ statusCode: 400, message: 'Can only request info on pending issues' })
  }

  await db
    .update(issues)
    .set({
      infoRequest: body.question.trim(),
      infoRequestedAt: new Date(),
      infoResponse: null,
      infoRespondedAt: null,
    })
    .where(eq(issues.id, id))

  await createAuditLog({
    type: 'moderation',
    action: 'request_info',
    status: 'needs_review',
    issueId: id,
    userId: issue.authorId,
    reason: body.question.trim(),
    details: { adminId: session.user.id },
  })

  return { success: true }
})
