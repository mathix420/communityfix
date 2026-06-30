// One-shot backfill of issue + tag embeddings. Safe to re-run — only
// `embedding IS NULL` rows are touched.
// Run via: doppler run -- bun scripts/backfill-embeddings.ts

import { drizzle } from 'drizzle-orm/postgres-js'
import { eq, isNull, sql } from 'drizzle-orm'
import postgres from 'postgres'
import OpenAI from 'openai'
import { issues, tags } from '../server/database/schema'

const databaseUrl = process.env.NUXT_DATABASE_URL
if (!databaseUrl) throw new Error('NUXT_DATABASE_URL is not set — run me through `doppler run --`')
const apiKey = process.env.NUXT_OPENAI_API_KEY
if (!apiKey) throw new Error('NUXT_OPENAI_API_KEY is not set — run me through `doppler run --`')

const CONCURRENCY = 5

const client = postgres(databaseUrl, { max: 5 })
const db = drizzle(client, { schema: { issues, tags } })
const openai = new OpenAI({ apiKey })

async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return res.data[0]!.embedding
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`
}

async function backfillIssue(row: {
  id: number
  title: string
  summary: string
  description: string | null
}) {
  const input = [row.title, row.summary, row.description].filter(Boolean).join('\n')
  const vec = await embed(input)
  await db
    .update(issues)
    .set({ embedding: sql`${toVectorLiteral(vec)}::vector` })
    .where(eq(issues.id, row.id))
  return row.id
}

async function backfillTag(row: { id: number; slug: string; name: string }) {
  // Slug carries shorthand the name doesn't (e.g. "ev" vs "Electric vehicles").
  const vec = await embed(`${row.name}\n${row.slug}`)
  await db
    .update(tags)
    .set({ embedding: sql`${toVectorLiteral(vec)}::vector` })
    .where(eq(tags.id, row.id))
  return row.id
}

async function runBatch<T>(label: string, items: T[], fn: (item: T) => Promise<unknown>) {
  if (items.length === 0) {
    console.log(`No ${label} to backfill.`)
    return
  }
  console.log(
    `Backfilling ${items.length} ${label} with text-embedding-3-small (${CONCURRENCY} in parallel)...`,
  )
  let done = 0
  let failed = 0
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(batch.map(fn))
    for (const r of results) {
      if (r.status === 'fulfilled') {
        done++
      } else {
        failed++
        console.error('  fail:', r.reason?.message ?? r.reason)
      }
    }
    console.log(`  ${done + failed}/${items.length} done (failed: ${failed})`)
  }
  console.log(`Finished ${label}: ${done} embedded, ${failed} failed.\n`)
}

try {
  const pendingIssues = await db.query.issues.findMany({
    where: isNull(issues.embedding),
    columns: { id: true, title: true, summary: true, description: true },
  })
  await runBatch('issues', pendingIssues, backfillIssue)

  const pendingTags = await db.query.tags.findMany({
    where: isNull(tags.embedding),
    columns: { id: true, slug: true, name: true },
  })
  await runBatch('tags', pendingTags, backfillTag)
} catch (err) {
  console.error('Backfill aborted:', err)
  process.exitCode = 1
} finally {
  await client.end({ timeout: 5 })
}
