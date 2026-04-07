import { eq, desc } from 'drizzle-orm'
import { issues, users } from '../database/schema'

// Number of rejected posts (out of the most recent 10) that triggers a ban.
export const BAN_REJECTION_THRESHOLD = 4
// Number of recent posts considered when evaluating the ban rule.
export const BAN_LOOKBACK_WINDOW = 10

/**
 * Pure: returns true when a user with this rejection count in their last
 * `BAN_LOOKBACK_WINDOW` posts should be auto-banned. Extracted for testing.
 */
export function shouldBan(rejectedCount: number): boolean {
  return rejectedCount >= BAN_REJECTION_THRESHOLD
}

/**
 * Pure: computes the ban expiry date — exactly one month from `now`. Uses
 * UTC ms math (28 days) so that the result is independent of the host's
 * local timezone and avoids the `Date#setMonth` Jan-31 edge case where
 * setMonth(+1) on Jan 31 lands in early March instead of late February.
 */
export function computeBanExpiry(now: Date = new Date()): Date {
  const ONE_MONTH_MS = 28 * 24 * 60 * 60 * 1000
  return new Date(now.getTime() + ONE_MONTH_MS)
}

/**
 * Check user's last 10 posts — if >= 4 are rejected, ban for ~1 month.
 */
export async function checkAndApplyBan(userId: string) {
  const db = useDB()

  const recentPosts = await db.query.issues.findMany({
    where: eq(issues.authorId, userId),
    orderBy: desc(issues.createdAt),
    limit: BAN_LOOKBACK_WINDOW,
    columns: { status: true },
  })

  const rejectedCount = recentPosts.filter(p => p.status === 'rejected').length

  if (shouldBan(rejectedCount)) {
    await db.update(users)
      .set({
        bannedUntil: computeBanExpiry(),
        banReason: `Automatically banned: ${rejectedCount} of your last ${recentPosts.length} posts were rejected by moderation.`,
        banAppealedAt: null,
        banAppealStatus: null,
      })
      .where(eq(users.id, userId))
  }
}

/**
 * Reusable guard — throws 403 if user is currently banned.
 */
export async function assertNotBanned(userId: string) {
  const db = useDB()

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { bannedUntil: true, banReason: true, banAppealStatus: true },
  })

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'User account not found. Please log in again.' })
  }

  if (user.bannedUntil && user.bannedUntil > new Date()) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Your account is temporarily banned.',
      data: {
        bannedUntil: user.bannedUntil,
        reason: user.banReason,
        appealStatus: user.banAppealStatus,
      },
    })
  }
}
