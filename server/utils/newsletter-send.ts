// The newsletter send loop, called by the newsletter:weekly / :monthly cron
// tasks. Mirrors compute:trust-scores' shape: recipients are processed in
// small chunks so the run fits the Workers cron CPU budget, and one failing
// recipient never aborts the batch. Digest content comes from
// newsletter-digest.ts, templates from newsletter-email.ts.
import { and, eq, isNull, lt, or, sql } from 'drizzle-orm'
import { newsletterPrefs, users, type NewsletterFrequency } from '../database/schema'
import { buildRunContext, buildUserDigest, NEWSLETTER_BASE_URL } from './newsletter-digest'
import { renderNewsletterEmail } from './newsletter-email'
import { issueUnsubscribeToken } from './newsletter-token'
import { sendEmail } from './email'

const CHUNK_SIZE = 10

// How far back each digest looks.
const WINDOW_DAYS: Record<NewsletterFrequency, number> = { weekly: 7, monthly: 31 }

// Double-send guard: skip anyone who already got a digest this close to now.
// Below the nominal period so a cron that fires slightly early (or a retried
// invocation) doesn't drop a legitimate send, but a same-day re-run is a no-op.
const MIN_RESEND_DAYS: Record<NewsletterFrequency, number> = { weekly: 5, monthly: 25 }

export interface NewsletterRunResult {
  frequency: NewsletterFrequency
  recipients: number
  sent: number
  /** Recipients whose digest came back empty — nothing was sent to them. */
  empty: number
  failures: Array<{ userId: string; error: string }>
}

export async function runNewsletterSend(
  frequency: NewsletterFrequency,
): Promise<NewsletterRunResult> {
  const db = useDB()
  const resendCutoff = new Date(Date.now() - MIN_RESEND_DAYS[frequency] * 24 * 60 * 60 * 1000)

  const recipients = await db
    .select({
      userId: newsletterPrefs.userId,
      content: newsletterPrefs.content,
      email: users.email,
      name: users.name,
    })
    .from(newsletterPrefs)
    .innerJoin(users, eq(users.id, newsletterPrefs.userId))
    .where(
      and(
        eq(newsletterPrefs.enabled, true),
        eq(newsletterPrefs.frequency, frequency),
        or(isNull(newsletterPrefs.lastSentAt), lt(newsletterPrefs.lastSentAt, resendCutoff)),
        or(isNull(users.bannedUntil), lt(users.bannedUntil, sql`now()`)),
      ),
    )

  const result: NewsletterRunResult = {
    frequency,
    recipients: recipients.length,
    sent: 0,
    empty: 0,
    failures: [],
  }
  if (recipients.length === 0) return result

  const ctx = await buildRunContext(WINDOW_DAYS[frequency])

  for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
    const chunk = recipients.slice(i, i + CHUNK_SIZE)
    const outcomes = await Promise.allSettled(
      chunk.map(async (r) => {
        // A null content jsonb means nothing was ever picked — empty digest.
        const sections = r.content ? await buildUserDigest(ctx, r.userId, r.content) : []
        if (sections.length === 0) return 'empty' as const

        const token = await issueUnsubscribeToken(r.userId)
        const { subject, html, text } = renderNewsletterEmail({
          name: r.name,
          frequency,
          sections,
          unsubscribeUrl: `${NEWSLETTER_BASE_URL}/api/newsletter/unsubscribe?token=${token}`,
        })
        await sendEmail(null, { to: r.email, subject, html, text })

        // Only after the send succeeded, so a failed recipient is retried by
        // the next run instead of being silently marked as served.
        await db
          .update(newsletterPrefs)
          .set({ lastSentAt: sql`now()` })
          .where(eq(newsletterPrefs.userId, r.userId))
        return 'sent' as const
      }),
    )
    outcomes.forEach((outcome, idx) => {
      const userId = chunk[idx]!.userId
      if (outcome.status === 'fulfilled') {
        result[outcome.value === 'sent' ? 'sent' : 'empty']++
      } else {
        const message =
          outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason)
        console.error(`[newsletter:${frequency}] failed for user ${userId}:`, outcome.reason)
        result.failures.push({ userId, error: message })
      }
    })
  }

  return result
}
