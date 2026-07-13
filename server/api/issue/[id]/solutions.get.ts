import { eq, ne, sql } from 'drizzle-orm'
import { issues } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const issueId = requireIdParam(event)

  const query = getQuery(event)
  const sortBy = (query.sort as string) || 'trending'
  const searchTerm = (query.search as string) || ''

  const conditions = [
    eq(issues.parentId, issueId),
    ne(issues.status, 'rejected'),
    eq(issues.type, 'solution'),
  ]

  if (searchTerm.trim()) {
    conditions.push(sql`search_vector @@ plainto_tsquery('english', ${searchTerm.trim()})`)
  }

  return listIssueNodes(conditions, sortBy, 'trending')
})
