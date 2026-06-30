import { eq, sql, and, isNotNull, isNull } from 'drizzle-orm'
import { auditLogs, issues, users, caseStudies } from '../../database/schema'

export default defineEventHandler(async () => {
  const db = useDB()

  const [
    logStats,
    issueAppeals,
    banAppeals,
    pendingIssues,
    awaitingInfo,
    pendingCaseStudies,
    oldestPendingIssue,
    oldestPendingCaseStudy,
    oldestNeedsReview,
    oldestAppeal,
  ] = await Promise.all([
    db
      .select({
        needsReview: sql<number>`COUNT(*) FILTER (WHERE ${auditLogs.status} = 'needs_review')`,
        total: sql<number>`COUNT(*)`,
      })
      .from(auditLogs),

    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(issues)
      .where(eq(issues.appealStatus, 'pending')),

    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(and(eq(users.banAppealStatus, 'pending'))),

    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(issues)
      .where(eq(issues.status, 'pending')),

    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(issues)
      .where(
        and(
          eq(issues.status, 'pending'),
          isNotNull(issues.infoRequest),
          isNull(issues.infoResponse),
        ),
      ),

    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(caseStudies)
      .where(eq(caseStudies.status, 'pending')),

    db
      .select({ at: sql<string | null>`MIN(${issues.createdAt})` })
      .from(issues)
      .where(eq(issues.status, 'pending')),

    db
      .select({ at: sql<string | null>`MIN(${caseStudies.createdAt})` })
      .from(caseStudies)
      .where(eq(caseStudies.status, 'pending')),

    db
      .select({ at: sql<string | null>`MIN(${auditLogs.createdAt})` })
      .from(auditLogs)
      .where(eq(auditLogs.status, 'needs_review')),

    db
      .select({ at: sql<string | null>`MIN(${issues.appealedAt})` })
      .from(issues)
      .where(eq(issues.appealStatus, 'pending')),
  ])

  // Oldest unresolved across all categories — drives the SLA signal in the UI.
  const candidates = [
    oldestPendingIssue[0]?.at,
    oldestPendingCaseStudy[0]?.at,
    oldestNeedsReview[0]?.at,
    oldestAppeal[0]?.at,
  ].filter((d): d is string => !!d)
  const oldestUnresolvedAt = candidates.length
    ? candidates.reduce((a, b) => (new Date(a) < new Date(b) ? a : b))
    : null

  return {
    pendingReviews: Number(logStats[0]?.needsReview ?? 0),
    totalLogs: Number(logStats[0]?.total ?? 0),
    issueAppeals: Number(issueAppeals[0]?.count ?? 0),
    banAppeals: Number(banAppeals[0]?.count ?? 0),
    pendingIssues: Number(pendingIssues[0]?.count ?? 0),
    awaitingInfo: Number(awaitingInfo[0]?.count ?? 0),
    pendingCaseStudies: Number(pendingCaseStudies[0]?.count ?? 0),
    oldestUnresolvedAt,
  }
})
