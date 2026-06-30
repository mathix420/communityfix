import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { caseStudies } from '../database/schema'
import type { CaseStudyOutcome, LocationScale } from '../database/schema'
import { CASE_STUDY_OUTCOMES, LOCATION_SCALES } from '../database/schema'
import { generateEmbedding, findSimilar } from '../utils/embeddings'
import { transformCaseStudy } from '../utils/case-study-write'

// Global case-study discovery — "what has actually worked, and where?".
//
// Case studies are the documented real-world deployments a discovery GPT cares
// about most, yet /api/issue/{id}/case-studies only reaches them via a known
// node id. This endpoint searches them across the whole catalog: optional
// semantic `query`, plus `outcome` / `scale` / `verified` filters. Only
// approved case studies are ever returned.
//
//   - With `query` (≥3 chars): ranked by embedding similarity, each row carries
//     a `similarity` (0–100). Falls back to recency if embeddings are down.
//   - Without `query`: verified-first, then most recent.

const SIMILARITY_THRESHOLD = 0.2

// Author + parent solution are needed for transformCaseStudy (author name and
// solutionTitle).
const caseStudyWith = {
  author: { columns: { name: true } },
  solution: { columns: { title: true, summary: true } },
} as const

function clampLimit(raw: unknown): number {
  const n = raw != null ? parseInt(String(raw), 10) : NaN
  if (Number.isNaN(n)) return 10
  return Math.min(Math.max(n, 1), 25)
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const query = ((q.query as string) || '').trim()
  const outcomeRaw = q.outcome as string | undefined
  const outcome =
    outcomeRaw && (CASE_STUDY_OUTCOMES as readonly string[]).includes(outcomeRaw)
      ? (outcomeRaw as CaseStudyOutcome)
      : undefined
  const scaleRaw = q.scale as string | undefined
  const scale =
    scaleRaw && (LOCATION_SCALES as readonly string[]).includes(scaleRaw)
      ? (scaleRaw as LocationScale)
      : undefined
  const verified = q.verified === 'true' ? true : q.verified === 'false' ? false : undefined
  const limit = clampLimit(q.limit)

  const db = useDB()

  // --- Semantic path: rank approved case studies by similarity to `query`. ---
  if (query.length >= 3) {
    let embedding: number[] | null = null
    try {
      embedding = await generateEmbedding(query)
    } catch (err) {
      console.error('[case-studies] embedding failed, falling back to recency:', err)
    }

    if (embedding) {
      const where = sql`status = 'approved'${
        outcome ? sql` AND outcome = ${outcome}` : sql``
      }${scale ? sql` AND scale = ${scale}` : sql``}${
        verified !== undefined ? sql` AND verified = ${verified}` : sql``
      }`

      const above = await findSimilar<{ id: number; similarity: number }>({
        table: 'case_studies',
        columns: 'id',
        embedding,
        where,
        limit,
        threshold: SIMILARITY_THRESHOLD,
      })
      if (above.length === 0) return []

      const ids = above.map((r) => r.id)
      const rows = await db.query.caseStudies.findMany({
        where: inArray(caseStudies.id, ids),
        with: caseStudyWith,
      })
      const byId = new Map(rows.map((r) => [r.id, r]))
      return above
        .map((r) => {
          const row = byId.get(r.id)
          return row
            ? { ...transformCaseStudy(row), similarity: Math.round(r.similarity * 100) }
            : null
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
    }
  }

  // --- Non-semantic path: filtered list, verified-first then most recent. ---
  const conditions = [eq(caseStudies.status, 'approved')]
  if (outcome) conditions.push(eq(caseStudies.outcome, outcome))
  if (scale) conditions.push(eq(caseStudies.scale, scale))
  if (verified !== undefined) conditions.push(eq(caseStudies.verified, verified))

  const rows = await db.query.caseStudies.findMany({
    where: and(...conditions),
    with: caseStudyWith,
    orderBy: [desc(caseStudies.verified), desc(caseStudies.createdAt)],
    limit,
  })
  return rows.map(transformCaseStudy)
})
