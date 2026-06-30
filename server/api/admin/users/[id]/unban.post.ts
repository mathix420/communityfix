import { eq } from 'drizzle-orm'
import { users } from '../../../../database/schema'
import { createAuditLog } from '../../../../utils/audit-log'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDB()
  const id = getRouterParam(event, 'id')!
  const body = await readBody<{ reason?: string }>(event)

  const user = await db.query.users.findFirst({ where: eq(users.id, id) })
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  await db
    .update(users)
    .set({
      bannedUntil: null,
      banReason: null,
      banAppealedAt: null,
      banAppealStatus: null,
      banAppealReason: null,
    })
    .where(eq(users.id, id))

  await createAuditLog({
    type: 'admin_override',
    action: 'unban',
    userId: id,
    reason: body.reason || 'Admin lifted ban',
    details: {
      adminId: session.user.id,
      previousBannedUntil: user.bannedUntil?.toISOString() ?? null,
    },
  })

  return { success: true }
})
