import { eq } from 'drizzle-orm'
import { users } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDB()

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { bannedUntil: true, banAppealStatus: true },
  })

  if (!user?.bannedUntil || new Date(user.bannedUntil) <= new Date()) {
    throw createError({ statusCode: 400, statusMessage: 'You are not currently banned' })
  }
  if (user.banAppealStatus) {
    throw createError({ statusCode: 400, statusMessage: 'An appeal has already been submitted' })
  }

  const body = await readBody<{ reason?: string }>(event)

  await db.update(users)
    .set({
      banAppealedAt: new Date().toISOString(),
      banAppealStatus: 'pending',
    })
    .where(eq(users.id, session.user.id))

  return { success: true }
})
