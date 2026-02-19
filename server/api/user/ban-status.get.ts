import { eq } from 'drizzle-orm'
import { users } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDB()

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { bannedUntil: true, banReason: true, banAppealedAt: true, banAppealStatus: true },
  })

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const isBanned = !!user.bannedUntil && new Date(user.bannedUntil) > new Date()

  return {
    banned: isBanned,
    bannedUntil: isBanned ? user.bannedUntil : null,
    reason: isBanned ? user.banReason : null,
    appealStatus: isBanned ? user.banAppealStatus : null,
  }
})
