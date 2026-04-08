import { count, desc, eq, inArray } from 'drizzle-orm'
import { qualifications, qualificationEndorsements } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDB()

  const rows = await db.query.qualifications.findMany({
    where: eq(qualifications.userId, session.user.id),
    orderBy: [desc(qualifications.createdAt)],
  })

  const ids = rows.map(r => r.id)
  const counts = ids.length
    ? await db
        .select({
          qualificationId: qualificationEndorsements.qualificationId,
          n: count(qualificationEndorsements.id).as('n'),
        })
        .from(qualificationEndorsements)
        .where(inArray(qualificationEndorsements.qualificationId, ids))
        .groupBy(qualificationEndorsements.qualificationId)
    : []
  const countMap = new Map(counts.map(c => [c.qualificationId, Number(c.n)]))

  return rows.map(r => ({
    id: r.id,
    title: r.title,
    area: r.area,
    detail: r.detail,
    createdAt: r.createdAt,
    endorsementCount: countMap.get(r.id) ?? 0,
  }))
})
