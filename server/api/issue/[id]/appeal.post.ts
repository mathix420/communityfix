import { eq } from 'drizzle-orm'
import { issues } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const issueId = getRouterParam(event, 'id')
  if (!issueId || isNaN(parseInt(issueId, 10))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid issue ID' })
  }

  const body = await readBody<{ reason?: string }>(event)
  if (!body.reason?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Appeal reason is required' })
  }

  const db = useDB()
  const issue = await db.query.issues.findFirst({
    where: eq(issues.id, parseInt(issueId, 10)),
    columns: { id: true, authorId: true, status: true, isSpam: true, appealStatus: true },
  })

  if (!issue) {
    throw createError({ statusCode: 404, statusMessage: 'Issue not found' })
  }
  if (issue.authorId !== session.user.id) {
    throw createError({ statusCode: 403, statusMessage: 'You can only appeal your own issues' })
  }
  if (issue.status !== 'rejected') {
    throw createError({ statusCode: 400, statusMessage: 'Only rejected issues can be appealed' })
  }
  if (issue.isSpam) {
    throw createError({ statusCode: 400, statusMessage: 'This issue cannot be appealed' })
  }
  if (issue.appealStatus) {
    throw createError({ statusCode: 400, statusMessage: 'An appeal has already been submitted' })
  }

  await db.update(issues)
    .set({
      appealReason: body.reason.trim(),
      appealStatus: 'pending',
      appealedAt: new Date().toISOString(),
    })
    .where(eq(issues.id, issue.id))

  return { success: true }
})
