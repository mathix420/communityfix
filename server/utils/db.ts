import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../database/schema'

export function useDB() {
  let d1: D1Database | undefined

  try {
    const event = useEvent()
    d1 = event.context.cloudflare?.env?.DB
  }
  catch {
    // Scheduled tasks (cron) have no request context — fall back to global env
    d1 = (globalThis as Record<string, any>).__env__?.DB
  }

  if (!d1) throw new Error('D1 database binding not found')
  return drizzle(d1, { schema })
}
