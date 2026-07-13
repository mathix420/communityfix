import { and, eq } from 'drizzle-orm'
import { userInterests } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }

  const db = useDB()
  const result = await db
    .delete(userInterests)
    .where(and(eq(userInterests.id, id), eq(userInterests.userId, session.user.id)))
    .returning({ id: userInterests.id })

  if (result.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Interest not found' })
  }

  return { ok: true }
})
