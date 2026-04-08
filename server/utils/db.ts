import { AsyncLocalStorage } from 'node:async_hooks'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { useEvent } from 'nitropack/runtime'
import * as schema from '../database/schema'

type DB = ReturnType<typeof drizzle<typeof schema>>

// Cloudflare Hyperdrive + postgres-js: per Cloudflare's docs the client must
// be created *inside* the fetch handler because TCP sockets cannot span
// Worker requests. Caching a client at module scope on Workers produces
// intermittent "Failed query" errors on the next request in the same
// isolate — the cached client holds a dead socket, and postgres-js only
// reconnects on the query *after* the one that hit the dead socket.
//
//   - `max: 5`             stay under Workers' concurrent outbound conn cap
//   - `fetch_types: false` skip the pg_type introspection round-trip
//   - `prepare` default    recent Hyperdrive fix caches prepared statements
//                          for postgres-js, so `prepare: false` is no
//                          longer required and would disable that cache
function createClient(url: string): DB {
  const client = postgres(url, { max: 5, fetch_types: false })
  return drizzle(client, { schema })
}

const scopedDbStore = new AsyncLocalStorage<DB>()

export function withScopedDB<T>(fn: () => Promise<T>): Promise<T> {
  const url = process.env.NUXT_DATABASE_URL
  if (!url) {
    throw new Error('NUXT_DATABASE_URL is not set. withScopedDB requires the hyperdrive plugin to have hydrated it first.')
  }
  return scopedDbStore.run(createClient(url), fn)
}

// Off-Workers singleton (dev server, vitest, db:migrate / db:seed scripts).
let _nodeDb: DB | null = null

const isWorker = typeof navigator !== 'undefined'
  && (navigator as { userAgent?: string }).userAgent === 'Cloudflare-Workers'

// Symbol so we don't collide with other middleware on event.context and
// don't need a string-keyed cast.
const EVENT_DB_KEY: unique symbol = Symbol('cf.db')

export function useDB(): DB {
  const url = process.env.NUXT_DATABASE_URL
  if (!url) {
    throw new Error('NUXT_DATABASE_URL is not set. On Cloudflare Workers, ensure the HYPERDRIVE binding is configured and the hyperdrive plugin has run.')
  }

  if (!isWorker) {
    return _nodeDb ??= createClient(url)
  }

  const scoped = scopedDbStore.getStore()
  if (scoped) return scoped

  // `useEvent()` throws when there is no active request (module init,
  // unknown caller). Fall through to an uncached fresh client in that case.
  let event
  try {
    event = useEvent()
  }
  catch {
    event = undefined
  }

  if (event) {
    const ctx = event.context as { [EVENT_DB_KEY]?: DB }
    return ctx[EVENT_DB_KEY] ??= createClient(url)
  }

  return createClient(url)
}
