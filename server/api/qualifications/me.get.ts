import { count, desc, eq, inArray } from 'drizzle-orm'
import { qualifications, qualificationEndorsements } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDB()

  const rows = await db.query.qualifications.findMany({
    where: eq(qualifications.userId, session.user.id),
    orderBy: [desc(qualifications.createdAt)],
  })

  // Split counts by kind: peer 'endorsement' rows are tallied into the
  // endorsementCount; presence of a 'verification' row flips isVerified.
  // Mirrors the same shape returned by /api/user/[id].
  const ids = rows.map((r) => r.id)
  const counts = ids.length
    ? await db
        .select({
          qualificationId: qualificationEndorsements.qualificationId,
          kind: qualificationEndorsements.kind,
          n: count(qualificationEndorsements.id).as('n'),
        })
        .from(qualificationEndorsements)
        .where(inArray(qualificationEndorsements.qualificationId, ids))
        .groupBy(qualificationEndorsements.qualificationId, qualificationEndorsements.kind)
    : []
  const countMap = new Map<number, number>()
  const verifiedSet = new Set<number>()
  for (const c of counts) {
    if (c.kind === 'verification') {
      if (Number(c.n) > 0) verifiedSet.add(c.qualificationId)
    } else {
      countMap.set(c.qualificationId, (countMap.get(c.qualificationId) ?? 0) + Number(c.n))
    }
  }

  // Admins' own credentials are auto-verified (matches /api/user/[id]).
  const ownerIsAdmin = isAdminEmail(session.user.email)

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    area: r.area,
    detail: r.detail,
    createdAt: r.createdAt,
    endorsementCount: countMap.get(r.id) ?? 0,
    isVerified: verifiedSet.has(r.id) || ownerIsAdmin,
  }))
})
