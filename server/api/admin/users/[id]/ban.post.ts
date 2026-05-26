import { eq } from 'drizzle-orm'
import { users } from '../../../../database/schema'
import { createAuditLog } from '../../../../utils/audit-log'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDB()
  const id = getRouterParam(event, 'id')!
  const body = await readBody<{ reason: string, days?: number }>(event)

  if (!body.reason?.trim()) {
    throw createError({ statusCode: 400, message: 'Ban reason is required' })
  }

  const days = Math.min(3650, Math.max(1, Number(body.days) || 30))
  const bannedUntil = new Date()
  bannedUntil.setUTCDate(bannedUntil.getUTCDate() + days)

  const user = await db.query.users.findFirst({ where: eq(users.id, id) })
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  await db.update(users)
    .set({
      bannedUntil,
      banReason: body.reason.trim(),
      banAppealStatus: null,
      banAppealReason: null,
      banAppealedAt: null,
    })
    .where(eq(users.id, id))

  await createAuditLog({
    type: 'admin_override',
    action: 'ban',
    userId: id,
    reason: body.reason.trim(),
    details: {
      adminId: session.user.id,
      manual: true,
      days,
      bannedUntil: bannedUntil.toISOString(),
      previousBannedUntil: user.bannedUntil?.toISOString() ?? null,
    },
  })

  return { success: true, bannedUntil: bannedUntil.toISOString() }
})
