import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { issues, issueSdgs, issueTags, tags as tagsTable } from '../database/schema'
import type { IssueType } from '../database/schema'
import { issueWithRelations, transformIssue } from '../utils/transform-issue'

// Browse issues AND solutions by taxonomy — "show me everything tagged X" or
// "everything mapped to SDG N".
//
// /api/issues only lists top-level issues with a single tag filter; this covers
// both node kinds (and sub-issues) and adds SDG filtering. At least one of `tag`
// or `sdg` is required — this is a filtered browse, not a full dump. Only
// approved nodes are returned. When both filters are given they intersect.

function clampLimit(raw: unknown): number {
  const n = raw != null ? parseInt(String(raw), 10) : NaN
  if (Number.isNaN(n)) return 20
  return Math.min(Math.max(n, 1), 50)
}

export default defineEventHandler(async (event) => {
  const db = useDB()
  const q = getQuery(event)

  const rawType = q.type as string | undefined
  const type: IssueType | undefined =
    rawType === 'issue' || rawType === 'solution' ? rawType : undefined
  const tagSlug = (q.tag as string)?.trim() || undefined
  const sdgRaw = q.sdg != null ? parseInt(q.sdg as string, 10) : NaN
  const sdgId = Number.isNaN(sdgRaw) ? undefined : sdgRaw
  const sortBy = (q.sort as string) || 'most_voted'
  const limit = clampLimit(q.limit)

  if (!tagSlug && sdgId == null) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Provide a tag slug and/or an sdg id to filter by.',
    })
  }

  const conditions = [eq(issues.status, 'approved')]
  if (type) conditions.push(eq(issues.type, type))

  // Tag filter — resolve the slug, then the issue ids carrying it.
  if (tagSlug) {
    const tag = await db.query.tags.findFirst({ where: eq(tagsTable.slug, tagSlug) })
    if (!tag) return []
    const junction = await db.query.issueTags.findMany({
      where: eq(issueTags.tagId, tag.id),
      columns: { issueId: true },
    })
    if (junction.length === 0) return []
    conditions.push(
      inArray(
        issues.id,
        junction.map((r) => r.issueId),
      ),
    )
  }

  // SDG filter — issue ids mapped to the goal. A second inArray ANDs with the
  // tag set above, so both filters intersect.
  if (sdgId != null) {
    const junction = await db.query.issueSdgs.findMany({
      where: eq(issueSdgs.sdgId, sdgId),
      columns: { issueId: true },
    })
    if (junction.length === 0) return []
    conditions.push(
      inArray(
        issues.id,
        junction.map((r) => r.issueId),
      ),
    )
  }

  let orderByClause
  switch (sortBy) {
    case 'oldest':
      orderByClause = asc(issues.createdAt)
      break
    case 'newest':
      orderByClause = desc(issues.createdAt)
      break
    case 'trending':
      // HN-style ranking — keep in sync with server/api/issues.get.ts.
      orderByClause = sql`(
        ${issues.voteScore} + ${issues.solutionCount} * 3 + ${issues.subIssueCount} * 2
      )::float / POWER(EXTRACT(EPOCH FROM (NOW() - ${issues.createdAt})) / 3600 + 2, 1.5) DESC`
      break
    default:
      orderByClause = desc(issues.voteScore)
  }

  const results = await db.query.issues.findMany({
    where: and(...conditions),
    with: issueWithRelations,
    orderBy: orderByClause,
    limit,
  })
  return results.map((i) => transformIssue(i))
})
