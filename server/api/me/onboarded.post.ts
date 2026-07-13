// Stamp users.onboarded_at so the post-login redirect stops sending the user
// to /onboarding. Idempotent: the first call sets the timestamp, later calls
// leave it untouched.
import { and, eq, isNull, sql } from 'drizzle-orm'
import { users } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDB()

  await db
    .update(users)
    .set({ onboardedAt: sql`now()` })
    .where(and(eq(users.id, session.user.id), isNull(users.onboardedAt)))

  return { ok: true }
})
