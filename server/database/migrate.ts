import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Run by `bun run db:migrate`. Order:
//   1. Ensure required Postgres extensions exist (postgis, vector)
//   2. Apply drizzle-managed migrations from server/database/migrations/
//   3. Apply each .sql file in migrations/custom/ in alphabetical order
// Reads NUXT_DATABASE_URL — for Neon use the *direct* (non-pooled) URL.

const url = process.env.NUXT_DATABASE_URL || 'postgres://communityfix:communityfix@localhost:5432/communityfix'
const client = postgres(url, { max: 1 })
const db = drizzle(client)

try {
  const migrationsFolder = join(import.meta.dirname!, 'migrations')

  // 1. Ensure extensions exist before any DDL references geometry/vector
  // types. Locally `docker/init.sql` already creates them; on Neon prod
  // a fresh branch needs us to create them up front, otherwise the very
  // first drizzle migration fails with `type "geometry" does not exist`.
  console.log('Ensuring required extensions (postgis, vector)...')
  await client.unsafe('CREATE EXTENSION IF NOT EXISTS postgis;')
  await client.unsafe('CREATE EXTENSION IF NOT EXISTS vector;')
  console.log('Extensions ready.')

  // 2. Run drizzle-managed migrations
  console.log('Running drizzle migrations...')
  await migrate(db, { migrationsFolder })
  console.log('Drizzle migrations applied.')

  // 3. Run custom migrations (indexes, generated columns, CHECK constraints)
  const customDir = join(migrationsFolder, 'custom')
  try {
    const files = (await readdir(customDir)).filter(f => f.endsWith('.sql')).sort()
    for (const file of files) {
      const sql = await readFile(join(customDir, file), 'utf-8')
      console.log(`Running custom migration: ${file}`)
      await client.unsafe(sql)
    }
    console.log('Custom migrations applied.')
  }
  catch (err: any) {
    if (err.code === 'ENOENT') {
      console.log('No custom migrations directory found, skipping.')
    }
    else {
      throw err
    }
  }

  console.log('Done.')
}
catch (err) {
  console.error('Migration failed:', err)
  await client.end({ timeout: 5 })
  process.exit(1)
}

await client.end()
