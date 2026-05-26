import { eq, sql, and, isNotNull, isNull } from 'drizzle-orm'
import { auditLogs, issues, users } from '../../database/schema'

export default defineEventHandler(async () => {
  const db = useDB()

  const [logStats, issueAppeals, banAppeals, pendingIssues, awaitingInfo] = await Promise.all([
    db.select({
      needsReview: sql<number>`COUNT(*) FILTER (WHERE ${auditLogs.status} = 'needs_review')`,
      total: sql<number>`COUNT(*)`,
    }).from(auditLogs),

    db.select({ count: sql<number>`COUNT(*)` })
      .from(issues)
      .where(eq(issues.appealStatus, 'pending')),

    db.select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(and(eq(users.banAppealStatus, 'pending'))),

    db.select({ count: sql<number>`COUNT(*)` })
      .from(issues)
      .where(eq(issues.status, 'pending')),

    db.select({ count: sql<number>`COUNT(*)` })
      .from(issues)
      .where(and(
        eq(issues.status, 'pending'),
        isNotNull(issues.infoRequest),
        isNull(issues.infoResponse),
      )),
  ])

  return {
    pendingReviews: Number(logStats[0]?.needsReview ?? 0),
    totalLogs: Number(logStats[0]?.total ?? 0),
    issueAppeals: Number(issueAppeals[0]?.count ?? 0),
    banAppeals: Number(banAppeals[0]?.count ?? 0),
    pendingIssues: Number(pendingIssues[0]?.count ?? 0),
    awaitingInfo: Number(awaitingInfo[0]?.count ?? 0),
  }
})
