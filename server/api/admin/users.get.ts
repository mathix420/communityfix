import { and, desc, eq, ilike, isNotNull, or, sql, type SQL } from 'drizzle-orm'
import { users, issues } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const query = getQuery(event)

  const search = (query.q as string | undefined)?.trim() ?? ''
  const filter = query.filter as string | undefined
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 25))

  const conditions: SQL[] = []
  if (search) {
    const isUuidLike = /^[0-9a-f-]{8,}$/i.test(search)
    conditions.push(
      isUuidLike
        ? or(ilike(users.email, `%${search}%`), ilike(users.name, `%${search}%`), sql`${users.id}::text ILIKE ${`%${search}%`}`)!
        : or(ilike(users.email, `%${search}%`), ilike(users.name, `%${search}%`))!,
    )
  }
  if (filter === 'banned') {
    conditions.push(sql`${users.bannedUntil} IS NOT NULL AND ${users.bannedUntil} > NOW()`)
  }
  else if (filter === 'ban_appeal') {
    conditions.push(eq(users.banAppealStatus, 'pending'))
  }

  const where = conditions.length ? and(...conditions) : undefined

  // Aggregate issue counts per author once and join, instead of correlated
  // subqueries — the correlated form rendered the outer ref as a bare "id",
  // which Postgres bound to issues.id (integer) and blew up against
  // users.id (uuid).
  const issueCounts = db.$with('issue_counts').as(
    db.select({
      authorId: issues.authorId,
      total: sql<number>`COUNT(*)`.as('total'),
      rejected: sql<number>`COUNT(*) FILTER (WHERE ${issues.status} = 'rejected')`.as('rejected'),
    })
      .from(issues)
      .where(isNotNull(issues.authorId))
      .groupBy(issues.authorId),
  )

  const [rows, countResult] = await Promise.all([
    db.with(issueCounts)
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        trustScore: users.trustScore,
        bannedUntil: users.bannedUntil,
        banReason: users.banReason,
        banAppealStatus: users.banAppealStatus,
        createdAt: users.createdAt,
        issueCount: sql<number>`COALESCE(${issueCounts.total}, 0)`,
        rejectedCount: sql<number>`COALESCE(${issueCounts.rejected}, 0)`,
      })
      .from(users)
      .leftJoin(issueCounts, eq(issueCounts.authorId, users.id))
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),

    db.select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(where),
  ])

  return {
    users: rows.map(r => ({
      ...r,
      issueCount: Number(r.issueCount),
      rejectedCount: Number(r.rejectedCount),
    })),
    total: Number(countResult[0]?.count ?? 0),
    page,
    limit,
  }
})
