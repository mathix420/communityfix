import { eq, isNull, and, inArray, ne, desc, asc, sql } from 'drizzle-orm'
import { issues, tags as tagsTable, issueTags } from '../database/schema'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const query = getQuery(event)
  const tagFilter = query.tag as string | undefined
  const sortBy = (query.sort as string) || 'newest'
  const searchTerm = (query.search as string) || ''
  const lat = query.lat ? parseFloat(query.lat as string) : undefined
  const lng = query.lng ? parseFloat(query.lng as string) : undefined
  const radius = query.radius ? parseFloat(query.radius as string) : undefined

  const conditions = [isNull(issues.parentId), ne(issues.status, 'rejected')]

  // Tag filter
  if (tagFilter) {
    const tag = await db.query.tags.findFirst({
      where: eq(tagsTable.slug, tagFilter),
    })
    if (!tag) return []

    const junctionRows = await db.query.issueTags.findMany({
      where: eq(issueTags.tagId, tag.id),
      columns: { issueId: true },
    })
    const issueIds = junctionRows.map(r => r.issueId)
    if (issueIds.length === 0) return []

    conditions.push(inArray(issues.id, issueIds))
  }

  // Full-text search
  if (searchTerm.trim()) {
    conditions.push(
      sql`search_vector @@ plainto_tsquery('english', ${searchTerm.trim()})`,
    )
  }

  // Location filter
  if (lat != null && lng != null && radius != null && !isNaN(lat) && !isNaN(lng) && !isNaN(radius)) {
    const radiusMeters = radius * 1000
    conditions.push(
      sql`ST_DWithin(${issues.location}::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusMeters})`,
    )
  }

  // Sort
  let orderByClause
  switch (sortBy) {
    case 'oldest':
      orderByClause = asc(issues.createdAt)
      break
    case 'most_voted':
      orderByClause = desc(issues.voteScore)
      break
    case 'trending':
      // HN-style ranking: engagement / (age_hours + 2) ^ gravity
      // Solutions (3x) and sub-issues (2x) weigh more than raw votes.
      // Keep this in sync with server/api/issue/[id]/{issues,solutions}.get.ts
      // and docs/ranking-and-trust.md.
      orderByClause = sql`(
        ${issues.voteScore} + ${issues.solutionCount} * 3 + ${issues.subIssueCount} * 2
      )::float / POWER(EXTRACT(EPOCH FROM (NOW() - ${issues.createdAt})) / 3600 + 2, 1.5) DESC`
      break
    default:
      orderByClause = desc(issues.createdAt)
  }

  const results = await db.query.issues.findMany({
    where: and(...conditions),
    with: issueWithRelations,
    orderBy: orderByClause,
  })
  return results.map(i => transformIssue(i))
})
