// Upsert the signed-in user's newsletter preferences. Collection side only —
// nothing is sent from here.
import { sql } from 'drizzle-orm'
import {
  newsletterPrefs,
  NEWSLETTER_FREQUENCIES,
  type NewsletterContent,
  type NewsletterFrequency,
} from '../../database/schema'

const CONTENT_KEYS = [
  'goodNews',
  'skillMatches',
  'topicMatches',
  'helpWanted',
  'productUpdates',
] as const

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  const body = await readBody<{
    enabled?: unknown
    frequency?: unknown
    content?: unknown
  }>(event)

  if (typeof body?.enabled !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'enabled must be a boolean' })
  }
  const enabled = body.enabled

  const frequency = (body.frequency ?? 'monthly') as NewsletterFrequency
  if (!NEWSLETTER_FREQUENCIES.includes(frequency)) {
    throw createError({
      statusCode: 400,
      statusMessage: `frequency must be one of: ${NEWSLETTER_FREQUENCIES.join(', ')}`,
    })
  }

  const rawContent = (body.content ?? {}) as Record<string, unknown>
  if (typeof rawContent !== 'object' || rawContent === null || Array.isArray(rawContent)) {
    throw createError({ statusCode: 400, statusMessage: 'content must be an object' })
  }
  const content = {} as NewsletterContent
  for (const key of CONTENT_KEYS) {
    const value = rawContent[key] ?? false
    if (typeof value !== 'boolean') {
      throw createError({ statusCode: 400, statusMessage: `content.${key} must be a boolean` })
    }
    content[key] = value
  }

  const db = useDB()
  const [row] = await db
    .insert(newsletterPrefs)
    .values({ userId: session.user.id, enabled, frequency, content })
    .onConflictDoUpdate({
      target: newsletterPrefs.userId,
      set: { enabled, frequency, content, updatedAt: sql`now()` },
    })
    .returning()

  return {
    enabled: row!.enabled,
    frequency: row!.frequency,
    content: row!.content,
  }
})
