import { eq, isNull, inArray, ne, sql } from 'drizzle-orm'
import { issues, tags as tagsTable, issueTags, issueSdgs } from '../database/schema'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const query = getQuery(event)
  const tagFilter = query.tag as string | undefined
  const sdgFilter = query.sdg ? parseInt(query.sdg as string, 10) : undefined
  const sortBy = (query.sort as string) || 'most_voted'
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
    const issueIds = junctionRows.map((r) => r.issueId)
    if (issueIds.length === 0) return []

    conditions.push(inArray(issues.id, issueIds))
  }

  // SDG filter — moderation maps every approved node to its goals, so
  // top-level issues always carry their own mapping (same shape as the tag
  // filter above).
  if (sdgFilter != null && !isNaN(sdgFilter)) {
    const junctionRows = await db.query.issueSdgs.findMany({
      where: eq(issueSdgs.sdgId, sdgFilter),
      columns: { issueId: true },
    })
    const issueIds = junctionRows.map((r) => r.issueId)
    if (issueIds.length === 0) return []

    conditions.push(inArray(issues.id, issueIds))
  }

  // Full-text search
  if (searchTerm.trim()) {
    conditions.push(sql`search_vector @@ plainto_tsquery('english', ${searchTerm.trim()})`)
  }

  // Location filter
  if (
    lat != null &&
    lng != null &&
    radius != null &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    !isNaN(radius)
  ) {
    const radiusMeters = radius * 1000
    conditions.push(
      sql`ST_DWithin(${issues.location}::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusMeters})`,
    )
  }

  return listIssueNodes(conditions, sortBy, 'newest')
})
