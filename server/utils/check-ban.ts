import { eq, desc } from 'drizzle-orm'
import { issues, users } from '../database/schema'

/**
 * Check user's last 10 posts — if >= 4 are rejected, ban for 1 month.
 */
export async function checkAndApplyBan(userId: string) {
  const db = useDB()

  const recentPosts = await db.query.issues.findMany({
    where: eq(issues.authorId, userId),
    orderBy: desc(issues.createdAt),
    limit: 10,
    columns: { status: true },
  })

  const rejectedCount = recentPosts.filter(p => p.status === 'rejected').length

  if (rejectedCount >= 4) {
    const bannedUntil = new Date()
    bannedUntil.setMonth(bannedUntil.getMonth() + 1)

    await db.update(users)
      .set({
        bannedUntil: bannedUntil.toISOString(),
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

  if (user?.bannedUntil && new Date(user.bannedUntil) > new Date()) {
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
