import { and, eq } from 'drizzle-orm'
import { qualifications } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }

  const db = useDB()
  const result = await db.delete(qualifications)
    .where(and(eq(qualifications.id, id), eq(qualifications.userId, session.user.id)))
    .returning({ id: qualifications.id })

  if (result.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Qualification not found' })
  }

  return { ok: true }
})
