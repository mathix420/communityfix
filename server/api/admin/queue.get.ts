import { eq, and, desc, sql, isNotNull, isNull, or, inArray } from 'drizzle-orm'
import { issues, auditLogs, users, caseStudies } from '../../database/schema'

export default defineEventHandler(async () => {
  const db = useDB()

  const [uncertain, pendingAppeals, infoReceived, banAppeals, pendingCaseStudies] =
    await Promise.all([
      db.query.auditLogs.findMany({
        where: and(
          eq(auditLogs.status, 'needs_review'),
          or(
            eq(auditLogs.action, 'flag_uncertain'),
            eq(auditLogs.action, 'reparent'),
            eq(auditLogs.action, 'convert_to_case_study'),
          ),
        ),
        with: {
          issue: {
            columns: {
              id: true,
              title: true,
              summary: true,
              description: true,
              type: true,
              status: true,
              parentId: true,
              createdAt: true,
              infoRequest: true,
              infoResponse: true,
              infoRequestedAt: true,
            },
          },
          user: {
            columns: { id: true, name: true, email: true, trustScore: true, createdAt: true },
          },
        },
        orderBy: desc(auditLogs.createdAt),
        limit: 50,
      }),

      db.query.issues.findMany({
        where: eq(issues.appealStatus, 'pending'),
        with: {
          author: {
            columns: { id: true, name: true, email: true, trustScore: true, createdAt: true },
          },
        },
        columns: {
          id: true,
          title: true,
          summary: true,
          description: true,
          type: true,
          status: true,
          rejectionReason: true,
          appealReason: true,
          appealedAt: true,
          createdAt: true,
        },
        orderBy: desc(issues.appealedAt),
        limit: 50,
      }),

      db.query.issues.findMany({
        where: and(
          eq(issues.status, 'pending'),
          isNotNull(issues.infoRequest),
          isNotNull(issues.infoResponse),
        ),
        with: {
          author: {
            columns: { id: true, name: true, email: true, trustScore: true, createdAt: true },
          },
        },
        columns: {
          id: true,
          title: true,
          summary: true,
          description: true,
          type: true,
          status: true,
          infoRequest: true,
          infoResponse: true,
          infoRespondedAt: true,
          createdAt: true,
        },
        orderBy: desc(issues.infoRespondedAt),
        limit: 50,
      }),

      db.query.users.findMany({
        where: eq(users.banAppealStatus, 'pending'),
        columns: {
          id: true,
          name: true,
          email: true,
          trustScore: true,
          createdAt: true,
          banReason: true,
          banAppealReason: true,
          banAppealedAt: true,
          bannedUntil: true,
        },
        limit: 50,
      }),

      db.query.caseStudies.findMany({
        where: eq(caseStudies.status, 'pending'),
        with: {
          author: {
            columns: { id: true, name: true, email: true, trustScore: true, createdAt: true },
          },
          solution: { columns: { id: true, title: true } },
        },
        columns: {
          id: true,
          solutionId: true,
          status: true,
          outcome: true,
          description: true,
          locationName: true,
          implementer: true,
          createdAt: true,
        },
        orderBy: desc(caseStudies.createdAt),
        limit: 50,
      }),
    ])

  // Hydrate per-author rejection counts for everyone we're surfacing. One
  // grouped query beats N round-trips and lets the UI flag repeat-offenders
  // without an extra click.
  const authorIds = Array.from(
    new Set<string>([
      ...uncertain.map((u) => u.user?.id).filter((v): v is string => !!v),
      ...pendingAppeals.map((p) => p.author?.id).filter((v): v is string => !!v),
      ...infoReceived.map((r) => r.author?.id).filter((v): v is string => !!v),
      ...pendingCaseStudies.map((c) => c.author?.id).filter((v): v is string => !!v),
    ]),
  )

  const rejectionCounts = authorIds.length
    ? await db
        .select({
          userId: issues.authorId,
          rejected: sql<number>`COUNT(*) FILTER (WHERE ${issues.status} = 'rejected')`,
          approved: sql<number>`COUNT(*) FILTER (WHERE ${issues.status} = 'approved')`,
        })
        .from(issues)
        .where(and(inArray(issues.authorId, authorIds), isNotNull(issues.authorId)))
        .groupBy(issues.authorId)
    : []

  const rejectionMap = new Map<string, { rejected: number; approved: number }>()
  for (const row of rejectionCounts) {
    if (row.userId)
      rejectionMap.set(row.userId, {
        rejected: Number(row.rejected),
        approved: Number(row.approved),
      })
  }

  const attachStats = <T extends { id?: string } | null | undefined>(author: T) => {
    if (!author?.id) return null
    const stats = rejectionMap.get(author.id) ?? { rejected: 0, approved: 0 }
    return { ...author, ...stats }
  }

  return {
    uncertain: uncertain.map((log) => ({
      ...log,
      user: attachStats(log.user),
    })),
    pendingAppeals: pendingAppeals.map((p) => ({ ...p, author: attachStats(p.author) })),
    infoReceived: infoReceived.map((r) => ({ ...r, author: attachStats(r.author) })),
    pendingCaseStudies: pendingCaseStudies.map((c) => ({ ...c, author: attachStats(c.author) })),
    banAppeals,
  }
})
