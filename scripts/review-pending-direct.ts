// One-shot direct trigger of AI moderation on specific IDs against whatever
// database NUXT_DATABASE_URL points at — so it works for prod. Unlike
// scripts/review-pending.ts (which POSTs to a local dev server's
// /_nitro/tasks endpoint), this runs the review pipeline in-process.
//
// Run via:
//   doppler run -c prd -- bun scripts/review-pending-direct.ts [--remod] [--case-studies | --all-case-studies] <id>...
//
// Flags:
//   --remod              reset already-approved/rejected items back to pending
//                        before review (mirrors POST /api/admin/issues/[id]/remod).
//                        Without it, only items already in `pending` are processed.
//   --case-studies       interpret positional IDs as case_studies.id instead of
//                        issues.id; uses reviewCaseStudy.
//   --all-case-studies   shorthand: ignore positional IDs and process every row
//                        in case_studies.
//
// We can't import server/utils/db.ts directly because it pulls
// `nitropack/runtime`, which depends on virtual modules that only exist
// in a Nitro build. Instead we wire a plain postgres-js client and shim
// the Nitro auto-imports onto globalThis before importing the pipeline.

import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import postgres from 'postgres'
import * as schema from '../server/database/schema'
import { updateUserTrustScore } from '../server/utils/trust-score'
import { checkAndApplyBan } from '../server/utils/check-ban'

const args = process.argv.slice(2)
const remod = args.includes('--remod')
const caseStudyMode = args.includes('--case-studies') || args.includes('--all-case-studies')
const allCaseStudies = args.includes('--all-case-studies')
const flags = new Set(['--remod', '--case-studies', '--all-case-studies'])
let ids = args.filter(a => !flags.has(a)).map(Number).filter(n => Number.isFinite(n))
if (ids.length === 0 && !allCaseStudies) {
  console.error('Usage: bun scripts/review-pending-direct.ts [--remod] [--case-studies | --all-case-studies] <id> [<id>...]')
  process.exit(1)
}

if (!process.env.NUXT_DATABASE_URL) throw new Error('NUXT_DATABASE_URL is not set — run me through `doppler run --`')
if (!process.env.NUXT_OPENAI_API_KEY) throw new Error('NUXT_OPENAI_API_KEY is not set')
if (!process.env.NUXT_ANTHROPIC_API_KEY) throw new Error('NUXT_ANTHROPIC_API_KEY is not set')

const client = postgres(process.env.NUXT_DATABASE_URL, { max: 5 })
const db = drizzle(client, { schema })

const g = globalThis as Record<string, unknown>
g.useDB = () => db
g.useRuntimeConfig = () => ({
  openaiApiKey: process.env.NUXT_OPENAI_API_KEY,
  anthropicApiKey: process.env.NUXT_ANTHROPIC_API_KEY,
})
g.runTask = async (name: string) => {
  console.log(`  [stub] runTask('${name}') skipped (not in Nitro context)`)
}
g.updateUserTrustScore = updateUserTrustScore
g.checkAndApplyBan = checkAndApplyBan

const { reviewIssue } = await import('../server/utils/review-issue')
const { reviewCaseStudy } = await import('../server/utils/review-case-study')

async function resetIssueToPending(id: number) {
  await db.delete(schema.issueTags).where(eq(schema.issueTags.issueId, id))
  await db.delete(schema.issueSdgs).where(eq(schema.issueSdgs.issueId, id))
  await db.update(schema.issues)
    .set({
      status: 'pending',
      rejectionReason: null,
      rejectedAt: null,
      isSpam: false,
      appealStatus: null,
      appealReason: null,
      appealedAt: null,
      embedding: null,
    })
    .where(eq(schema.issues.id, id))
}

async function resetCaseStudyToPending(id: number) {
  await db.update(schema.caseStudies)
    .set({
      status: 'pending',
      rejectionReason: null,
      rejectedAt: null,
      isSpam: false,
      embedding: null,
    })
    .where(eq(schema.caseStudies.id, id))
}

if (allCaseStudies) {
  const rows = await db.select({ id: schema.caseStudies.id }).from(schema.caseStudies).orderBy(schema.caseStudies.id)
  ids = rows.map(r => r.id)
  console.log(`Found ${ids.length} case studies to process.\n`)
}

const noun = caseStudyMode ? 'case study' : 'issue'
for (const id of ids) {
  console.log(`Reviewing ${noun} #${id}...`)
  try {
    if (remod) {
      if (caseStudyMode) await resetCaseStudyToPending(id)
      else await resetIssueToPending(id)
      console.log(`  · reset to pending`)
    }
    if (caseStudyMode) await reviewCaseStudy(id)
    else await reviewIssue(id)
    console.log(`  ✓ done\n`)
  }
  catch (err) {
    console.error(`  ✗ failed:`, err, '\n')
  }
}

await client.end()
console.log('All done.')
process.exit(0)
