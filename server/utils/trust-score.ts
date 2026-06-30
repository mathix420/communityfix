import { eq, sql, and, ne, isNotNull } from 'drizzle-orm'
import {
  users,
  issues,
  votes,
  qualifications,
  qualificationEndorsements,
  revisions,
} from '../database/schema'
import { isAdminEmail } from './admin'
import { createAuditLog } from './audit-log'

export interface TrustScoreFactors {
  isAdmin: boolean
  accountAgeDays: number
  approvedCount: number
  rejectedCount: number
  solutionCount: number
  totalVotesReceived: number
  votesCast: number
  // Number of the user's own qualifications that have at least one
  // 'verification'-kind endorsement (i.e. an admin or team member vouched
  // for the credential). Each verified credential is a heavy positive
  // signal — far more reliable than peer endorsements.
  verifiedCredentials: number
  // Number of the user's collaborative-edit proposals that someone ELSE
  // approved (status='approved' AND decided_by_id <> proposer_id). Born-approved
  // self-edits are excluded by that filter. A small, capped positive signal —
  // accepted proposals show the user contributes good edits to others' content.
  proposalsApproved: number
  wasBanned: boolean
}

export function computeScore(factors: TrustScoreFactors): number {
  // Admins are 100 by fiat — the email allowlist already gates this and
  // bypasses all the other heuristics.
  if (factors.isAdmin) return 100

  // Account age: up to 15 pts (logarithmic, ~1 year to max)
  const agePts = Math.min(15, (15 * Math.log1p(factors.accountAgeDays)) / Math.log1p(365))

  // Approved contributions: up to 30 pts (logarithmic)
  const contribPts = Math.min(30, (30 * Math.log1p(factors.approvedCount)) / Math.log1p(50))

  // Approval rate: up to 15 pts (only counts if user has submitted at least 1 item)
  const totalSubmissions = factors.approvedCount + factors.rejectedCount
  const approvalRate = totalSubmissions > 0 ? factors.approvedCount / totalSubmissions : 1
  const approvalPts = totalSubmissions > 0 ? 15 * approvalRate : 0

  // Net votes received on content: up to 20 pts (logarithmic)
  const votePts =
    factors.totalVotesReceived > 0
      ? Math.min(20, (20 * Math.log1p(factors.totalVotesReceived)) / Math.log1p(200))
      : Math.max(-10, factors.totalVotesReceived) // Negative votes can deduct up to -10

  // Solution bonus: up to 10 pts (solutions are higher-value contributions)
  const solutionPts = Math.min(10, (10 * Math.log1p(factors.solutionCount)) / Math.log1p(20))

  // Engagement (votes cast on others' content): up to 10 pts
  const engagementPts = Math.min(10, (10 * Math.log1p(factors.votesCast)) / Math.log1p(100))

  // Verified credentials: up to 30 pts. Human-reviewed and more reliable
  // than activity metrics, but kept below half the total so a single
  // credential can't single-handedly mint a high-trust account — it has
  // to combine with real activity. +20 for the first, +5 for each
  // additional, capped at 30.
  const verifiedPts =
    factors.verifiedCredentials > 0 ? Math.min(30, 20 + (factors.verifiedCredentials - 1) * 5) : 0

  // Accepted proposals: up to 8 pts (logarithmic). Genuine collaborative edits
  // accepted by other owners/admins. Kept small so it nudges scores without
  // materially moving existing users who've never proposed an edit.
  const proposalPts =
    factors.proposalsApproved > 0
      ? Math.min(8, (8 * Math.log1p(factors.proposalsApproved)) / Math.log1p(20))
      : 0

  // Ban penalty: -20 pts
  const banPenalty = factors.wasBanned ? -20 : 0

  const raw =
    agePts +
    contribPts +
    approvalPts +
    votePts +
    solutionPts +
    engagementPts +
    verifiedPts +
    proposalPts +
    banPenalty
  return Math.round(Math.max(0, Math.min(100, raw)))
}

export async function computeUserTrustScore(userId: string): Promise<number> {
  const db = useDB()

  const [stats, voteStats, engagementStats, verifiedStats, proposalStats] = await Promise.all([
    // Contribution stats + account info
    db
      .select({
        email: users.email,
        createdAt: users.createdAt,
        bannedUntil: users.bannedUntil,
        approvedCount: sql<number>`COUNT(*) FILTER (WHERE ${issues.status} = 'approved')`.as(
          'approved_count',
        ),
        rejectedCount: sql<number>`COUNT(*) FILTER (WHERE ${issues.status} = 'rejected')`.as(
          'rejected_count',
        ),
        solutionCount:
          sql<number>`COUNT(*) FILTER (WHERE ${issues.status} = 'approved' AND ${issues.type} = 'solution')`.as(
            'solution_count',
          ),
      })
      .from(users)
      .leftJoin(issues, eq(issues.authorId, users.id))
      .where(eq(users.id, userId))
      .groupBy(users.id),

    // Total weighted votes received on user's approved issues
    db
      .select({
        totalVotes: sql<number>`COALESCE(SUM(${votes.value} * ${votes.weight}), 0)`.as(
          'total_votes',
        ),
      })
      .from(votes)
      .innerJoin(
        issues,
        and(
          eq(votes.issueId, issues.id),
          eq(issues.authorId, userId),
          ne(issues.status, 'rejected'),
        ),
      ),

    // Engagement: how many votes has this user cast
    db
      .select({
        votesCast: sql<number>`COUNT(*)`.as('votes_cast'),
      })
      .from(votes)
      .where(eq(votes.userId, userId)),

    // Verified credentials: count this user's qualifications that have at
    // least one 'verification'-kind endorsement on them. DISTINCT on the
    // qualification id so multiple verifications on the same credential
    // don't double-count.
    db
      .select({
        verifiedCount: sql<number>`COUNT(DISTINCT ${qualifications.id})`.as('verified_count'),
      })
      .from(qualifications)
      .innerJoin(
        qualificationEndorsements,
        and(
          eq(qualificationEndorsements.qualificationId, qualifications.id),
          eq(qualificationEndorsements.kind, 'verification'),
        ),
      )
      .where(eq(qualifications.userId, userId)),

    // Genuine accepted proposals: this user's revisions that were approved by
    // someone else. The `decided_by_id <> proposer_id` filter naturally drops
    // born-approved self-edits (owner/admin direct edits, where decider = proposer).
    db
      .select({
        approvedProposals: sql<number>`COUNT(*)`.as('approved_proposals'),
      })
      .from(revisions)
      .where(
        and(
          eq(revisions.proposerId, userId),
          eq(revisions.status, 'approved'),
          isNotNull(revisions.decidedById),
          ne(revisions.decidedById, userId),
        ),
      ),
  ])

  if (!stats[0]) return 0

  const row = stats[0]
  const accountAgeDays = Math.floor(
    (Date.now() - new Date(row.createdAt).getTime()) / (1000 * 60 * 60 * 24),
  )
  const wasBanned = row.bannedUntil !== null

  return computeScore({
    isAdmin: isAdminEmail(row.email),
    accountAgeDays,
    approvedCount: Number(row.approvedCount),
    rejectedCount: Number(row.rejectedCount),
    solutionCount: Number(row.solutionCount),
    totalVotesReceived: Number(voteStats[0]?.totalVotes ?? 0),
    votesCast: Number(engagementStats[0]?.votesCast ?? 0),
    verifiedCredentials: Number(verifiedStats[0]?.verifiedCount ?? 0),
    proposalsApproved: Number(proposalStats[0]?.approvedProposals ?? 0),
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

  const current = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { trustScore: true },
  })
  const oldScore = current?.trustScore ?? 0

  const score = await computeUserTrustScore(userId)

  await db
    .update(users)
    .set({ trustScore: score, trustScoreUpdatedAt: new Date() })
    .where(eq(users.id, userId))

  if (score !== oldScore) {
    await createAuditLog({
      type: 'trust_score',
      action: 'score_update',
      userId,
      details: { oldScore, newScore: score },
    })
  }

  return score
}
