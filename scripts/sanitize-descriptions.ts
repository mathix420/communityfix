// One-shot: re-run sanitizeSummary over every existing issues.summary so
// historical rows have the same constraints as new ones. Safe to re-run.

import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import postgres from 'postgres'
import { issues } from '../server/database/schema'
import { sanitizeSummary } from '../server/utils/issue-write'

const databaseUrl = process.env.NUXT_DATABASE_URL
if (!databaseUrl) throw new Error('NUXT_DATABASE_URL is not set — run me through `doppler run --`')

const client = postgres(databaseUrl, { max: 1 })
const db = drizzle(client, { schema: { issues } })

try {
  const rows = await db.query.issues.findMany({ columns: { id: true, summary: true } })
  let changed = 0
  for (const row of rows) {
    const cleaned = sanitizeSummary(row.summary)
    if (cleaned !== row.summary) {
      await db.update(issues).set({ summary: cleaned }).where(eq(issues.id, row.id))
      changed++
    }
  }
  console.log(`Sanitized ${changed} / ${rows.length} rows.`)
}
finally {
  await client.end({ timeout: 5 })
}
