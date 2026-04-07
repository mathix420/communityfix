import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../database/schema'

// Keyed cache: the Hyperdrive plugin mutates `process.env.NUXT_DATABASE_URL`
// per request (in dev/local it stays constant), so we re-derive on each call
// and only rebuild the client when the URL actually changes. We can't read
// from `useRuntimeConfig()` because Nitro freezes the shared runtime config
// at module init and never re-reads `process.env` mutations.
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null
let _dbUrl: string | null = null

export function useDB() {
  const url = process.env.NUXT_DATABASE_URL
  if (!url) {
    throw new Error('NUXT_DATABASE_URL is not set. On Cloudflare Workers, ensure the HYPERDRIVE binding is configured and the hyperdrive plugin has run.')
  }

  if (!_db || _dbUrl !== url) {
    // `prepare: false` is required for transaction-pooled connections
    // (Hyperdrive, pgbouncer) which do not support prepared statements.
    const client = postgres(url, { prepare: false })
    _db = drizzle(client, { schema })
    _dbUrl = url
  }
  return _db
}
