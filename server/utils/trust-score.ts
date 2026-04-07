import { eq, sql, and, ne } from 'drizzle-orm'
import { users, issues, votes } from '../database/schema'

export interface TrustScoreFactors {
  accountAgeDays: number
  approvedCount: number
  rejectedCount: number
  solutionCount: number
  totalVotesReceived: number
  votesCast: number
  wasBanned: boolean
}

export function computeScore(factors: TrustScoreFactors): number {
  // Account age: up to 15 pts (logarithmic, ~1 year to max)
  const agePts = Math.min(15, 15 * Math.log1p(factors.accountAgeDays) / Math.log1p(365))

  // Approved contributions: up to 30 pts (logarithmic)
  const contribPts = Math.min(30, 30 * Math.log1p(factors.approvedCount) / Math.log1p(50))

  // Approval rate: up to 15 pts (only counts if user has submitted at least 1 item)
  const totalSubmissions = factors.approvedCount + factors.rejectedCount
  const approvalRate = totalSubmissions > 0 ? factors.approvedCount / totalSubmissions : 1
  const approvalPts = totalSubmissions > 0 ? 15 * approvalRate : 0

  // Net votes received on content: up to 20 pts (logarithmic)
  const votePts = factors.totalVotesReceived > 0
    ? Math.min(20, 20 * Math.log1p(factors.totalVotesReceived) / Math.log1p(200))
    : Math.max(-10, factors.totalVotesReceived) // Negative votes can deduct up to -10

  // Solution bonus: up to 10 pts (solutions are higher-value contributions)
  const solutionPts = Math.min(10, 10 * Math.log1p(factors.solutionCount) / Math.log1p(20))

  // Engagement (votes cast on others' content): up to 10 pts
  const engagementPts = Math.min(10, 10 * Math.log1p(factors.votesCast) / Math.log1p(100))

  // Ban penalty: -20 pts
  const banPenalty = factors.wasBanned ? -20 : 0

  const raw = agePts + contribPts + approvalPts + votePts + solutionPts + engagementPts + banPenalty
  return Math.round(Math.max(0, Math.min(100, raw)))
}

export async function computeUserTrustScore(userId: string): Promise<number> {
  const db = useDB()

  const [stats, voteStats, engagementStats] = await Promise.all([
    // Contribution stats + account info
    db.select({
      createdAt: users.createdAt,
      bannedUntil: users.bannedUntil,
      approvedCount: sql<number>`COUNT(*) FILTER (WHERE ${issues.status} = 'approved')`.as('approved_count'),
      rejectedCount: sql<number>`COUNT(*) FILTER (WHERE ${issues.status} = 'rejected')`.as('rejected_count'),
      solutionCount: sql<number>`COUNT(*) FILTER (WHERE ${issues.status} = 'approved' AND ${issues.type} = 'solution')`.as('solution_count'),
    })
      .from(users)
      .leftJoin(issues, eq(issues.authorId, users.id))
      .where(eq(users.id, userId))
      .groupBy(users.id),

    // Total weighted votes received on user's approved issues
    db.select({
      totalVotes: sql<number>`COALESCE(SUM(${votes.value} * ${votes.weight}), 0)`.as('total_votes'),
    })
      .from(votes)
      .innerJoin(issues, and(eq(votes.issueId, issues.id), eq(issues.authorId, userId), ne(issues.status, 'rejected'))),

    // Engagement: how many votes has this user cast
    db.select({
      votesCast: sql<number>`COUNT(*)`.as('votes_cast'),
    })
      .from(votes)
      .where(eq(votes.userId, userId)),
  ])

  if (!stats[0]) return 0

  const row = stats[0]
  const accountAgeDays = Math.floor((Date.now() - new Date(row.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  const wasBanned = row.bannedUntil !== null

  return computeScore({
    accountAgeDays,
    approvedCount: Number(row.approvedCount),
    rejectedCount: Number(row.rejectedCount),
    solutionCount: Number(row.solutionCount),
    totalVotesReceived: Number(voteStats[0]?.totalVotes ?? 0),
    votesCast: Number(engagementStats[0]?.votesCast ?? 0),
    wasBanned,
  })
}

/**
 * Convert a trust score (0–100) to a vote weight (1–5).
 * 0–19 → 1, 20–39 → 2, 40–59 → 3, 60–79 → 4, 80–100 → 5
 *
 * Defensively clamps on both ends so out-of-range inputs (e.g. a stale
 * negative score from before a CHECK constraint was added) still produce
 * a valid weight rather than 0 or 6.
 */
export function trustScoreToVoteWeight(trustScore: number): number {
  return Math.max(1, Math.min(5, Math.floor(trustScore / 20) + 1))
}

export async function updateUserTrustScore(userId: string): Promise<number> {
  const db = useDB()
  const score = await computeUserTrustScore(userId)

  await db.update(users)
    .set({ trustScore: score, trustScoreUpdatedAt: new Date() })
    .where(eq(users.id, userId))

  return score
}
