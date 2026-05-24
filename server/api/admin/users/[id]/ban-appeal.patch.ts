import { eq } from 'drizzle-orm'
import { users } from '../../../../database/schema'
import { createAuditLog } from '../../../../utils/audit-log'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDB()
  const id = getRouterParam(event, 'id')!
  const body = await readBody<{ status: 'approved' | 'denied', reason?: string }>(event)

  if (!['approved', 'denied'].includes(body.status)) {
    throw createError({ statusCode: 400, message: 'Status must be "approved" or "denied"' })
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, id) })
  if (!user || user.banAppealStatus !== 'pending') {
    throw createError({ statusCode: 404, message: 'No pending ban appeal for this user' })
  }

  if (body.status === 'approved') {
    await db.update(users)
      .set({
        bannedUntil: null,
        banReason: null,
        banAppealStatus: 'approved',
      })
      .where(eq(users.id, id))
  }
  else {
    await db.update(users)
      .set({ banAppealStatus: 'denied' })
      .where(eq(users.id, id))
  }

  await createAuditLog({
    type: 'appeal',
    action: body.status === 'approved' ? 'appeal_approved' : 'appeal_denied',
    userId: id,
    reason: body.reason || `Ban appeal ${body.status} by admin`,
    details: { adminId: session.user.id },
  })

  return { success: true }
})
