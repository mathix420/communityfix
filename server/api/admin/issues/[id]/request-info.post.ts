import { eq } from 'drizzle-orm'
import { issues } from '../../../../database/schema'
import { createAuditLog } from '../../../../utils/audit-log'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDB()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<{ question: string }>(event)

  if (!body.question?.trim()) {
    throw createError({ statusCode: 400, message: 'Question is required' })
  }

  const issue = await db.query.issues.findFirst({ where: eq(issues.id, id) })
  if (!issue) {
    throw createError({ statusCode: 404, message: 'Issue not found' })
  }
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
