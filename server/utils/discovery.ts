// Read-side business logic for the public discovery endpoints
// (/api/search, /api/case-studies, /api/nearby, /api/nodes). The route handlers
// stay thin plumbing; everything that touches the DB or parses query params
// lives here, mirroring how mcp-tools.ts backs the MCP route.
//
// Functions are kept small and single-purpose on purpose — the fallow PR gate
// flags any function whose estimated CRAP crosses 30 (which, with no coverage
// data, means roughly cyclomatic > 4), so parsing, query-building, and
// hydration are each their own helper.
import { and, asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm'
import { caseStudies, issueSdgs, issueTags, issues, tags as tagsTable } from '../database/schema'
import type { CaseStudyOutcome, IssueType, LocationScale } from '../database/schema'
import { CASE_STUDY_OUTCOMES, LOCATION_SCALES } from '../database/schema'
import { findSimilar, generateEmbedding } from './embeddings'
import { issueWithRelations, transformIssue } from './transform-issue'
import { transformCaseStudy } from './case-study-write'
import { searchByQuery } from './mcp-tools'

// getQuery() returns loosely-typed values; the helpers cast per field.
type QueryRecord = Record<string, unknown>

const CASE_STUDY_SIMILARITY_THRESHOLD = 0.2
const DEFAULT_RADIUS_KM = 25
const MAX_RADIUS_KM = 2000

// Author + parent solution are needed by transformCaseStudy (author name and
// solutionTitle).
const caseStudyWith = {
  author: { columns: { name: true } },
  solution: { columns: { title: true, summary: true } },
} as const

// ── Shared query-param coercion ─────────────────────────────────────

function clampInt(raw: unknown, fallback: number, max: number, min = 1): number {
  const n = raw != null ? parseInt(String(raw), 10) : NaN
  if (Number.isNaN(n)) return fallback
  return Math.min(Math.max(n, min), max)
}

function intOrUndefined(raw: unknown): number | undefined {
  const n = raw != null ? parseInt(String(raw), 10) : NaN
  return Number.isNaN(n) ? undefined : n
}

function oneOf<T extends string>(raw: unknown, allowed: readonly T[]): T | undefined {
  return typeof raw === 'string' && (allowed as readonly string[]).includes(raw)
    ? (raw as T)
    : undefined
}

function boolParam(raw: unknown): boolean | undefined {
  return raw === 'true' ? true : raw === 'false' ? false : undefined
}

function trimmedOrUndefined(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined
}

// ── /api/search: semantic search across issues and solutions ────────

export function searchCatalog(q: QueryRecord) {
  return searchByQuery({
    query: (q.query as string) || '',
    type: oneOf<IssueType>(q.type, ['issue', 'solution']) ?? 'any',
    limit: intOrUndefined(q.limit),
  })
}

// ── /api/case-studies: global case-study discovery ──────────────────

type CaseStudyFilters = { outcome?: CaseStudyOutcome; scale?: LocationScale; verified?: boolean }

function parseCaseStudyFilters(q: QueryRecord): CaseStudyFilters {
  return {
    outcome: oneOf<CaseStudyOutcome>(q.outcome, CASE_STUDY_OUTCOMES),
    scale: oneOf<LocationScale>(q.scale, LOCATION_SCALES),
    verified: boolParam(q.verified),
  }
}

function caseStudyConditions(f: CaseStudyFilters): SQL[] {
  const conditions = [eq(caseStudies.status, 'approved')]
  if (f.outcome) conditions.push(eq(caseStudies.outcome, f.outcome))
  if (f.scale) conditions.push(eq(caseStudies.scale, f.scale))
  if (f.verified !== undefined) conditions.push(eq(caseStudies.verified, f.verified))
  return conditions
}

function caseStudyWhereSql(f: CaseStudyFilters): SQL {
  return sql`status = 'approved'${f.outcome ? sql` AND outcome = ${f.outcome}` : sql``}${
    f.scale ? sql` AND scale = ${f.scale}` : sql``
  }${f.verified !== undefined ? sql` AND verified = ${f.verified}` : sql``}`
}

export async function discoverCaseStudies(q: QueryRecord) {
  const filters = parseCaseStudyFilters(q)
  const query = ((q.query as string) || '').trim()
  const limit = clampInt(q.limit, 10, 25)

  // Semantic path: rank approved case studies by similarity to `query`.
  if (query.length >= 3) {
    const ranked = await semanticCaseStudies(query, filters, limit)
    if (ranked) return ranked
    // ranked === null → embeddings unavailable; fall through to recency.
  }

  // Non-semantic path: filtered list, verified-first then most recent.
  const rows = await useDB().query.caseStudies.findMany({
    where: and(...caseStudyConditions(filters)),
    with: caseStudyWith,
    orderBy: [desc(caseStudies.verified), desc(caseStudies.createdAt)],
    limit,
  })
  return rows.map(transformCaseStudy)
}

// Returns ranked results, or null when embeddings can't be computed (so the
// caller falls back to a recency-ordered list).
async function semanticCaseStudies(query: string, filters: CaseStudyFilters, limit: number) {
  let embedding: number[]
  try {
    embedding = await generateEmbedding(query)
  } catch (err) {
    console.error('[case-studies] embedding failed, falling back to recency:', err)
    return null
  }

  const above = await findSimilar<{ id: number; similarity: number }>({
    table: 'case_studies',
    columns: 'id',
    embedding,
    where: caseStudyWhereSql(filters),
    limit,
    threshold: CASE_STUDY_SIMILARITY_THRESHOLD,
  })
  if (above.length === 0) return []

  const rows = await useDB().query.caseStudies.findMany({
    where: inArray(
      caseStudies.id,
      above.map((r) => r.id),
    ),
    with: caseStudyWith,
  })
  const byId = new Map(rows.map((r) => [r.id, r]))
  return above.flatMap((r) => {
    const row = byId.get(r.id)
    return row ? [{ ...transformCaseStudy(row), similarity: Math.round(r.similarity * 100) }] : []
  })
}

// ── /api/nearby: geographic discovery across all three kinds ────────

type NearbyKind = 'issue' | 'solution' | 'case-study' | 'any'
type GeoHit = { id: number; distance_m: number }

function parseLatLng(q: QueryRecord): { lat: number; lng: number } {
  const lat = parseFloat(q.lat as string)
  const lng = parseFloat(q.lng as string)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'lat and lng are required numeric query parameters',
    })
  }
  return { lat, lng }
}

function parseRadiusMeters(raw: unknown): number {
  const km = raw != null ? parseFloat(String(raw)) : NaN
  const bounded = Number.isFinite(km) && km > 0 ? Math.min(km, MAX_RADIUS_KM) : DEFAULT_RADIUS_KM
  return bounded * 1000
}

function distanceKm(hit: GeoHit): number {
  return Math.round((Number(hit.distance_m) / 1000) * 10) / 10
}

function emptyHits(): Promise<GeoHit[]> {
  return Promise.resolve<GeoHit[]>([])
}

// One KNN query against a table whose `location` is a geometry point. `extra`
// adds table-specific predicates (e.g. issues' type filter).
function geoHits(
  table: SQL,
  point: SQL,
  radiusMeters: number,
  limit: number,
  extra: SQL,
): Promise<GeoHit[]> {
  return useDB().execute<GeoHit>(
    sql`SELECT id, ST_Distance(location::geography, ${point}) AS distance_m
        FROM ${table}
        WHERE status = 'approved'${extra}
          AND ST_DWithin(location::geography, ${point}, ${radiusMeters})
        ORDER BY distance_m ASC
        LIMIT ${limit}`,
  ) as Promise<unknown> as Promise<GeoHit[]>
}

// Node-only `type =` predicate; empty for 'any'/'case-study'.
function nodeTypeFilter(kind: NearbyKind): SQL {
  return kind === 'issue' || kind === 'solution' ? sql` AND type = ${kind}` : sql``
}

function nearestHits(kind: NearbyKind, point: SQL, radiusMeters: number, limit: number) {
  const wantNodes = kind !== 'case-study'
  const wantStudies = kind === 'any' || kind === 'case-study'
  const nodeExtra = sql` AND location IS NOT NULL${nodeTypeFilter(kind)}`
  const nodes = wantNodes
    ? geoHits(sql`issues`, point, radiusMeters, limit, nodeExtra)
    : emptyHits()
  const studies = wantStudies
    ? geoHits(sql`case_studies`, point, radiusMeters, limit, sql``)
    : emptyHits()
  return Promise.all([nodes, studies])
}

function hydrateNodes(hits: GeoHit[]) {
  if (hits.length === 0) return Promise.resolve([])
  return useDB().query.issues.findMany({
    where: inArray(
      issues.id,
      hits.map((h) => h.id),
    ),
    with: issueWithRelations,
  })
}

function hydrateCaseStudies(hits: GeoHit[]) {
  if (hits.length === 0) return Promise.resolve([])
  return useDB().query.caseStudies.findMany({
    where: inArray(
      caseStudies.id,
      hits.map((h) => h.id),
    ),
    with: caseStudyWith,
  })
}

function nodeItems(hits: GeoHit[], rows: Awaited<ReturnType<typeof hydrateNodes>>) {
  const byId = new Map(rows.map((r) => [r.id, r]))
  return hits.flatMap((h) => {
    const row = byId.get(h.id)
    return row
      ? [
          {
            kind: row.type as 'issue' | 'solution',
            distanceKm: distanceKm(h),
            item: transformIssue(row),
          },
        ]
      : []
  })
}

function caseStudyItems(hits: GeoHit[], rows: Awaited<ReturnType<typeof hydrateCaseStudies>>) {
  const byId = new Map(rows.map((r) => [r.id, r]))
  return hits.flatMap((h) => {
    const row = byId.get(h.id)
    return row
      ? [{ kind: 'case-study' as const, distanceKm: distanceKm(h), item: transformCaseStudy(row) }]
      : []
  })
}

export async function findNearby(q: QueryRecord) {
  const { lat, lng } = parseLatLng(q)
  const radiusMeters = parseRadiusMeters(q.radius)
  const kind = oneOf<NearbyKind>(q.kind, ['issue', 'solution', 'case-study']) ?? 'any'
  const limit = clampInt(q.limit, 20, 50)
  const point = sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`

  const [nodeHits, studyHits] = await nearestHits(kind, point, radiusMeters, limit)
  const [nodeRows, studyRows] = await Promise.all([
    hydrateNodes(nodeHits),
    hydrateCaseStudies(studyHits),
  ])

  const items = [...nodeItems(nodeHits, nodeRows), ...caseStudyItems(studyHits, studyRows)]
  items.sort((a, b) => a.distanceKm - b.distanceKm)
  return items.slice(0, limit)
}

// ── /api/nodes: list issues/solutions by tag and/or SDG ─────────────

type NodeFilters = {
  type?: IssueType
  tagSlug?: string
  sdgId?: number
  sortBy: string
  limit: number
}

function parseNodeFilters(q: QueryRecord): NodeFilters {
  return {
    type: oneOf<IssueType>(q.type, ['issue', 'solution']),
    tagSlug: trimmedOrUndefined(q.tag),
    sdgId: intOrUndefined(q.sdg),
    sortBy: (q.sort as string) || 'most_voted',
    limit: clampInt(q.limit, 20, 50),
  }
}

function requireTaxonomy(f: NodeFilters): void {
  if (!f.tagSlug && f.sdgId == null) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Provide a tag slug and/or an sdg id to filter by.',
    })
  }
}

async function issueIdsByTag(slug: string): Promise<number[]> {
  const db = useDB()
  const tag = await db.query.tags.findFirst({ where: eq(tagsTable.slug, slug) })
  if (!tag) return []
  const rows = await db.query.issueTags.findMany({
    where: eq(issueTags.tagId, tag.id),
    columns: { issueId: true },
  })
  return rows.map((r) => r.issueId)
}

async function issueIdsBySdg(sdgId: number): Promise<number[]> {
  const rows = await useDB().query.issueSdgs.findMany({
    where: eq(issueSdgs.sdgId, sdgId),
    columns: { issueId: true },
  })
  return rows.map((r) => r.issueId)
}

// Intersection of every supplied taxonomy filter's issue ids. requireTaxonomy
// guarantees at least one set, so the reduce always has a seed.
async function constrainedIssueIds(f: NodeFilters): Promise<number[]> {
  const sets: number[][] = []
  if (f.tagSlug) sets.push(await issueIdsByTag(f.tagSlug))
  if (f.sdgId != null) sets.push(await issueIdsBySdg(f.sdgId))
  return sets.reduce((a, b) => a.filter((x) => b.includes(x)))
}

function nodeOrder(sortBy: string): SQL {
  const orders: Record<string, SQL> = {
    oldest: asc(issues.createdAt),
    newest: desc(issues.createdAt),
    most_voted: desc(issues.voteScore),
    // HN-style ranking — keep in sync with server/api/issues.get.ts.
    trending: sql`(
      ${issues.voteScore} + ${issues.solutionCount} * 3 + ${issues.subIssueCount} * 2
    )::float / POWER(EXTRACT(EPOCH FROM (NOW() - ${issues.createdAt})) / 3600 + 2, 1.5) DESC`,
  }
  return orders[sortBy] ?? orders.most_voted!
}

export async function listNodesByTaxonomy(q: QueryRecord) {
  const f = parseNodeFilters(q)
  requireTaxonomy(f)

  const ids = await constrainedIssueIds(f)
  if (ids.length === 0) return []

  const conditions = [eq(issues.status, 'approved'), inArray(issues.id, ids)]
  if (f.type) conditions.push(eq(issues.type, f.type))

  const results = await useDB().query.issues.findMany({
    where: and(...conditions),
    with: issueWithRelations,
    orderBy: nodeOrder(f.sortBy),
    limit: f.limit,
  })
  return results.map((i) => transformIssue(i))
}
