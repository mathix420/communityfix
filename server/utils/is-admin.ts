// Shared "is this user an admin?" helpers. Admin status is by-email allowlist
// (see server/utils/admin.ts), so checking it from a userId requires loading
// the user's email first. Both the revision endpoints and `/api/admin/me`
// reuse this so the lookup pattern lives in one place.
import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { users } from '../database/schema'
import { isAdminEmail } from './admin'

/**
 * True when the user with this id is on the admin allowlist. Loads the user's
 * email and defers to `isAdminEmail`. Returns false for an unknown/null id.
 */
export async function getIsAdmin(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false
  const db = useDB()
  const me = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { email: true },
  })
  return isAdminEmail(me?.email)
}

/**
 * True when the current session user is an admin. Mirrors the check behind
 * `/api/admin/me` — `requireUserSession` already exposes `user.email`, so no DB
 * read is needed.
 */
export async function isSessionAdmin(event: H3Event): Promise<boolean> {
  const { user } = await requireUserSession(event)
  return isAdminEmail(user.email)
}
