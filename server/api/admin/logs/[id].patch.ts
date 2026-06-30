import { eq } from 'drizzle-orm'
import { auditLogs } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDB()
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid log ID' })
  }

  const body = await readBody<{ status: 'reviewed' | 'overridden'; reviewNote?: string }>(event)
  if (!['reviewed', 'overridden'].includes(body.status)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Status must be "reviewed" or "overridden"',
    })
  }

  const rows = await db
    .update(auditLogs)
    .set({
      status: body.status,
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      reviewNote: body.reviewNote?.trim() || null,
    })
    .where(eq(auditLogs.id, id))
    .returning()

  if (!rows.length) {
    throw createError({ statusCode: 404, statusMessage: 'Log not found' })
  }

  return { success: true }
})
