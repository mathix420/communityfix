import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../database/schema'

export function useDB() {
  let d1: D1Database | undefined

  try {
    const event = useEvent()
    d1 = event.context.cloudflare?.env?.DB
  }
  catch (err) {
    // useEvent() throws when called outside a request context (e.g., cron tasks).
    // Only fall back for that specific case; re-throw unexpected errors.
    if (err instanceof Error && /no.*event|no.*context/i.test(err.message)) {
      d1 = (globalThis as Record<string, any>).__env__?.DB
    }
    else {
      throw err
    }
  }

  if (!d1) throw new Error('D1 database binding not found')
  return drizzle(d1, { schema })
}
