import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const url = process.env.NUXT_DATABASE_URL || 'postgres://communityfix:communityfix@localhost:5432/communityfix'
const client = postgres(url, { max: 1 })
const db = drizzle(client)

const migrationsFolder = join(import.meta.dirname!, 'migrations')

// 1. Run drizzle-managed migrations
console.log('Running drizzle migrations...')
await migrate(db, { migrationsFolder })
console.log('Drizzle migrations applied.')

// 2. Run custom migrations (extensions, indexes, generated columns)
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

await client.end()
console.log('Done.')
