import { eq, ne, and, desc, asc, sql } from 'drizzle-orm'
import { issues } from '../database/schema'
import { SOLUTION_STATUSES } from '../database/schema'
import type { SolutionStatus } from '../database/schema'

// Global solutions directory: every approved solution across all issues, with
// the same search/sort surface as /api/issues plus a solutionStatus filter.
export default defineEventHandler(async (event) => {
  const db = useDB()
  const query = getQuery(event)
  const sortBy = (query.sort as string) || 'most_voted'
  const searchTerm = (query.search as string) || ''
  const status = query.status as string | undefined

  const conditions = [eq(issues.type, 'solution'), ne(issues.status, 'rejected')]

  if (status && (SOLUTION_STATUSES as readonly string[]).includes(status)) {
    conditions.push(eq(issues.solutionStatus, status as SolutionStatus))
  }

  if (searchTerm.trim()) {
    conditions.push(sql`search_vector @@ plainto_tsquery('english', ${searchTerm.trim()})`)
  }

  let orderByClause
  switch (sortBy) {
    case 'oldest':
      orderByClause = asc(issues.createdAt)
      break
    case 'newest':
      orderByClause = desc(issues.createdAt)
      break
    default:
      orderByClause = desc(issues.voteScore)
  }

  const results = await db.query.issues.findMany({
    where: and(...conditions),
    with: issueWithRelations,
    orderBy: orderByClause,
  })

  return withMembers(
    'issue',
    results.map((i) => transformIssue(i)),
  )
})
