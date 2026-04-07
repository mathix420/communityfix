import { execSync } from 'node:child_process'

/**
 * Vitest global setup. Runs once before the entire suite.
 *
 * Ensures the test database has the latest schema and a fresh seed dataset
 * so integration tests have predictable values to assert against.
 *
 * Tests rely on `apiFetch` against a manually-started `bun run dev` server,
 * which uses the same `NUXT_DATABASE_URL`. Make sure that variable points
 * at a *local test* database (not Neon, not your dev work DB) before
 * running tests — the seed step is destructive in the sense that the
 * vote_score / counter UPDATEs at the end of `006_votes.sql` reset values
 * back to the canonical seed state.
 *
 * Pure unit tests under tests/unit/ don't need the DB at all. To run only
 * those, set SKIP_DB_SETUP=1 or use `bunx vitest run tests/unit`.
 */

export async function setup() {
  if (process.env.SKIP_DB_SETUP === '1') {
    console.log('[test setup] SKIP_DB_SETUP=1 — skipping DB migrate/seed')
    return
  }

  const url = process.env.NUXT_DATABASE_URL
  if (!url) {
    throw new Error(
      '[test setup] NUXT_DATABASE_URL is not set. Run tests via Doppler:\n'
      + '  doppler run -- bun run test\n'
      + 'or set NUXT_DATABASE_URL explicitly to a local test database.\n'
      + 'For pure unit tests (no DB needed), set SKIP_DB_SETUP=1.',
    )
  }

  // Refuse to run against anything that looks like a production database.
  // This is a defence-in-depth check — the seed step is destructive enough
  // that we never want to accidentally aim it at Neon prod.
  const looksLikeProd = /neon\.tech|prod|production/i.test(url) && !/test/i.test(url)
  if (looksLikeProd) {
    throw new Error(
      `[test setup] Refusing to run against what looks like a production URL: ${url.replace(/:[^@]+@/, ':***@')}\n`
      + 'Set NUXT_DATABASE_URL to a local test database before running tests.',
    )
  }

  console.log('[test setup] Applying migrations and seeds against test DB...')
  // We invoke the migrate script directly (without doppler) so we don't
  // re-wrap inside a doppler context — vitest is already running under
  // whatever env the user passed in.
  execSync('bun run server/database/migrate.ts', {
    stdio: 'inherit',
    env: process.env,
  })
  // The db:seed package script wraps psql in doppler; we replicate the
  // bash-loop directly here so we don't depend on a doppler binary.
  execSync(
    'for f in server/database/seed/*.sql; do psql "$NUXT_DATABASE_URL" -f "$f" >/dev/null; done',
    {
      stdio: 'inherit',
      shell: '/bin/bash',
      env: process.env,
    },
  )
  console.log('[test setup] DB ready.')
}

export async function teardown() {
  // No-op — the next test run reseeds from scratch, so leaving state behind
  // is fine and faster than tearing down on every invocation.
}
