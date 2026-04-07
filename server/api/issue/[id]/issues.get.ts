import { eq, and, desc, asc, sql } from 'drizzle-orm'
import { issues } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const id = getRouterParam(event, 'id')
  if (!id || isNaN(parseInt(id, 10))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid issue ID' })
  }

  const query = getQuery(event)
  const sortBy = (query.sort as string) || 'trending'

  let orderByClause
  switch (sortBy) {
    case 'oldest':
      orderByClause = asc(issues.createdAt)
      break
    case 'most_voted':
      orderByClause = desc(issues.voteScore)
      break
    case 'newest':
      orderByClause = desc(issues.createdAt)
      break
    case 'trending':
    default:
      // Trending formula — see server/api/issues.get.ts and docs/ranking-and-trust.md
      orderByClause = sql`(
        ${issues.voteScore} + ${issues.solutionCount} * 3 + ${issues.subIssueCount} * 2
      )::float / POWER(EXTRACT(EPOCH FROM (NOW() - ${issues.createdAt})) / 3600 + 2, 1.5) DESC`
      break
  }

  const results = await db.query.issues.findMany({
    where: and(
      eq(issues.parentId, parseInt(id, 10)),
      eq(issues.status, 'approved'),
      eq(issues.type, 'issue'),
    ),
    with: issueWithRelations,
    orderBy: orderByClause,
  })

  return results.map(i => transformIssue(i))
})
