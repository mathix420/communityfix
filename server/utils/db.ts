import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../database/schema'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function useDB() {
  if (!_db) {
    const url = useRuntimeConfig().databaseUrl
    if (!url) throw new Error('DATABASE_URL is not set. Add NUXT_DATABASE_URL to your environment.')
    const client = postgres(url)
    _db = drizzle(client, { schema })
  }
  return _db
}
