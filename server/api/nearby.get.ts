import { inArray, sql } from 'drizzle-orm'
import { caseStudies, issues } from '../database/schema'
import { issueWithRelations, transformIssue } from '../utils/transform-issue'
import { transformCaseStudy } from '../utils/case-study-write'

// Geographic discovery — "what has the community documented near this place?".
//
// Answers prompts like "find documented solutions tried near <somewhere>" by
// returning approved issues, solutions, AND case studies within `radius` km of
// a point, merged into one list ordered nearest-first. Each item is tagged with
// its `kind` and the `distanceKm` from the query point.
//
// Two cheap KNN queries (one per table) fetch the nearest ids + distance, then
// the rows are hydrated through the shared transforms so the shapes match the
// rest of the read API.

const DEFAULT_RADIUS_KM = 25
const MAX_RADIUS_KM = 2000

type Kind = 'issue' | 'solution' | 'case-study' | 'any'

function clamp(raw: unknown, fallback: number, max: number): number {
  const n = raw != null ? parseInt(String(raw), 10) : NaN
  if (Number.isNaN(n)) return fallback
  return Math.min(Math.max(n, 1), max)
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const lat = parseFloat(q.lat as string)
  const lng = parseFloat(q.lng as string)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'lat and lng are required numeric query parameters',
    })
  }
  const radiusRaw = q.radius != null ? parseFloat(q.radius as string) : NaN
  const radiusKm =
    Number.isFinite(radiusRaw) && radiusRaw > 0
      ? Math.min(radiusRaw, MAX_RADIUS_KM)
      : DEFAULT_RADIUS_KM
  const radiusMeters = radiusKm * 1000
  const rawKind = q.kind as string | undefined
  const kind: Kind =
    rawKind === 'issue' || rawKind === 'solution' || rawKind === 'case-study' ? rawKind : 'any'
  const limit = clamp(q.limit, 20, 50)

  const db = useDB()
  const point = sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`

  const wantNodes = kind === 'any' || kind === 'issue' || kind === 'solution'
  const wantCaseStudies = kind === 'any' || kind === 'case-study'

  // Step 1: nearest ids + distance per table (uses ::geography ST_DWithin radius
  // filter; ordered by distance so LIMIT keeps the closest).
  const typeFilter =
    kind === 'issue'
      ? sql` AND type = 'issue'`
      : kind === 'solution'
        ? sql` AND type = 'solution'`
        : sql``

  const [nodeHits, caseStudyHits] = await Promise.all([
    wantNodes
      ? db
          .execute<{ id: number; distance_m: number }>(
            sql`SELECT id, ST_Distance(location::geography, ${point}) AS distance_m
                FROM issues
                WHERE status = 'approved' AND location IS NOT NULL${typeFilter}
                  AND ST_DWithin(location::geography, ${point}, ${radiusMeters})
                ORDER BY distance_m ASC
                LIMIT ${limit}`,
          )
          .then((r) => r as unknown as { id: number; distance_m: number }[])
      : Promise.resolve([] as { id: number; distance_m: number }[]),
    wantCaseStudies
      ? db
          .execute<{ id: number; distance_m: number }>(
            sql`SELECT id, ST_Distance(location::geography, ${point}) AS distance_m
                FROM case_studies
                WHERE status = 'approved'
                  AND ST_DWithin(location::geography, ${point}, ${radiusMeters})
                ORDER BY distance_m ASC
                LIMIT ${limit}`,
          )
          .then((r) => r as unknown as { id: number; distance_m: number }[])
      : Promise.resolve([] as { id: number; distance_m: number }[]),
  ])

  // Step 2: hydrate the rich shapes for the ids we kept.
  const [nodeRows, caseStudyRows] = await Promise.all([
    nodeHits.length
      ? db.query.issues.findMany({
          where: inArray(
            issues.id,
            nodeHits.map((h) => h.id),
          ),
          with: issueWithRelations,
        })
      : Promise.resolve([]),
    caseStudyHits.length
      ? db.query.caseStudies.findMany({
          where: inArray(
            caseStudies.id,
            caseStudyHits.map((h) => h.id),
          ),
          with: {
            author: { columns: { name: true } },
            solution: { columns: { title: true, summary: true } },
          },
        })
      : Promise.resolve([]),
  ])

  const nodeById = new Map(nodeRows.map((r) => [r.id, r]))
  const caseStudyById = new Map(caseStudyRows.map((r) => [r.id, r]))

  const items = [
    ...nodeHits.flatMap((h) => {
      const row = nodeById.get(h.id)
      if (!row) return []
      return [
        {
          kind: row.type as 'issue' | 'solution',
          distanceKm: Math.round((Number(h.distance_m) / 1000) * 10) / 10,
          item: transformIssue(row),
        },
      ]
    }),
    ...caseStudyHits.flatMap((h) => {
      const row = caseStudyById.get(h.id)
      if (!row) return []
      return [
        {
          kind: 'case-study' as const,
          distanceKm: Math.round((Number(h.distance_m) / 1000) * 10) / 10,
          item: transformCaseStudy(row),
        },
      ]
    }),
  ]

  items.sort((a, b) => a.distanceKm - b.distanceKm)
  return items.slice(0, limit)
})
