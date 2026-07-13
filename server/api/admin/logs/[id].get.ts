import { eq } from 'drizzle-orm'
import { auditLogs } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const id = Number(getRouterParam(event, 'id'))

  const log = await db.query.auditLogs.findFirst({
    where: eq(auditLogs.id, id),
    with: {
      issue: { columns: { id: true, title: true, summary: true, type: true, status: true, rejectionReason: true, appealStatus: true, appealReason: true } },
      user: { columns: { id: true, name: true, email: true, trustScore: true, bannedUntil: true } },
      reviewer: { columns: { id: true, name: true } },
    },
  })

  if (!log) {
    throw createError({ statusCode: 404, message: 'Audit log not found' })
  }

  return log
})
