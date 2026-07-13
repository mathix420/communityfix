// The signed-in user's newsletter preferences. Returns defaults (disabled)
// when no row exists yet — the client can't tell the difference and doesn't
// need to.
import { eq } from 'drizzle-orm'
import { newsletterPrefs, type NewsletterContent } from '../../database/schema'

const DEFAULT_NEWSLETTER_CONTENT: NewsletterContent = {
  goodNews: false,
  skillMatches: false,
  topicMatches: false,
  helpWanted: false,
  productUpdates: false,
}

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDB()

  const row = await db.query.newsletterPrefs.findFirst({
    where: eq(newsletterPrefs.userId, session.user.id),
  })

  return {
    enabled: row?.enabled ?? false,
    frequency: row?.frequency ?? 'monthly',
    content: { ...DEFAULT_NEWSLETTER_CONTENT, ...(row?.content ?? {}) },
  }
})
