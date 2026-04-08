import { and, count, eq } from 'drizzle-orm'
import { qualificationEndorsements } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const viewerId = session.user.id

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }

  const db = useDB()

  await db.delete(qualificationEndorsements)
    .where(and(
      eq(qualificationEndorsements.qualificationId, id),
      eq(qualificationEndorsements.endorserId, viewerId),
    ))

  const [countRow] = await db
    .select({ n: count(qualificationEndorsements.id).as('n') })
    .from(qualificationEndorsements)
    .where(eq(qualificationEndorsements.qualificationId, id))

  return { ok: true, endorsementCount: Number(countRow?.n ?? 0) }
})
