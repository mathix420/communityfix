import { eq } from 'drizzle-orm'
import { users } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody<{ name?: string }>(event)

  const name = body.name?.trim() || null

  const db = useDB()
  await db.update(users)
    .set({ name, updatedAt: new Date().toISOString() })
    .where(eq(users.id, session.user.id))

  // Update the session with the new name
  await setUserSession(event, {
    user: {
      ...session.user,
      name,
    },
  })

  return { ok: true }
})
