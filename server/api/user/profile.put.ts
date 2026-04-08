import { eq } from 'drizzle-orm'
import { users } from '../../database/schema'

const MAX_NAME = 80
const MAX_HEADLINE = 120
const MAX_BIO = 2000
const MAX_LOCATION = 120

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody<{
    name?: string | null
    headline?: string | null
    bio?: string | null
    location?: string | null
  }>(event)

  const trim = (v: string | null | undefined, max: number) => {
    if (v == null) return null
    const t = v.trim()
    if (!t) return null
    if (t.length > max) {
      throw createError({ statusCode: 400, statusMessage: `Field too long (max ${max} characters)` })
    }
    return t
  }

  const patch = {
    name: trim(body.name, MAX_NAME),
    headline: trim(body.headline, MAX_HEADLINE),
    bio: trim(body.bio, MAX_BIO),
    location: trim(body.location, MAX_LOCATION),
    updatedAt: new Date(),
  }

  const db = useDB()
  await db.update(users)
    .set(patch)
    .where(eq(users.id, session.user.id))

  // Session only tracks `name` today — keep it in sync so the nav label updates
  // immediately. Other fields are re-fetched from /api/user/:id when viewed.
  await setUserSession(event, {
    user: {
      ...session.user,
      name: patch.name,
    },
  })

  return { ok: true }
})
