import { eq, desc, sql } from 'drizzle-orm'
import { users, issues, auditLogs, caseStudies } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const id = getRouterParam(event, 'id')!

  const [user, statusBreakdown, recentIssues, recentCaseStudies, recentLogs] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, id),
      columns: {
        id: true,
        email: true,
        name: true,
        headline: true,
        bio: true,
        location: true,
        provider: true,
        bannedUntil: true,
        banReason: true,
        banAppealStatus: true,
        banAppealReason: true,
        banAppealedAt: true,
        trustScore: true,
        trustScoreUpdatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),

    db
      .select({
        status: issues.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(issues)
      .where(eq(issues.authorId, id))
      .groupBy(issues.status),

    db.query.issues.findMany({
      where: eq(issues.authorId, id),
      columns: {
        id: true,
        title: true,
        summary: true,
        type: true,
        status: true,
        rejectionReason: true,
        appealStatus: true,
        createdAt: true,
      },
      orderBy: desc(issues.createdAt),
      limit: 20,
    }),

    db.query.caseStudies.findMany({
      where: eq(caseStudies.authorId, id),
      with: { solution: { columns: { id: true, title: true } } },
      columns: {
        id: true,
        solutionId: true,
        status: true,
        outcome: true,
        locationName: true,
        rejectionReason: true,
        createdAt: true,
      },
      orderBy: desc(caseStudies.createdAt),
      limit: 20,
    }),

    db.query.auditLogs.findMany({
      where: eq(auditLogs.userId, id),
      with: {
        issue: { columns: { id: true, title: true, type: true } },
        reviewer: { columns: { id: true, name: true } },
      },
      orderBy: desc(auditLogs.createdAt),
      limit: 30,
    }),
  ])

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const breakdown = { pending: 0, approved: 0, rejected: 0 } as Record<string, number>
  for (const row of statusBreakdown) {
    breakdown[row.status] = Number(row.count)
  }

  return {
    user,
    stats: breakdown,
    recentIssues,
    recentCaseStudies,
    recentLogs,
  }
})
