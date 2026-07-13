import { and, asc, desc, sql, type SQL } from 'drizzle-orm'
import { issues } from '../database/schema'
import { issueWithRelations, transformIssue } from './transform-issue'
import { withMembers } from './node-members'

type IssueListSort = 'newest' | 'most_voted' | 'trending'

// HN-style ranking: engagement / (age_hours + 2) ^ gravity. Solutions (3x) and
// sub-issues (2x) weigh more than raw votes. See docs/ranking-and-trust.md.
const trendingOrder = sql`(
  ${issues.voteScore} + ${issues.solutionCount} * 3 + ${issues.subIssueCount} * 2
)::float / POWER(EXTRACT(EPOCH FROM (NOW() - ${issues.createdAt})) / 3600 + 2, 1.5) DESC`

const sortOrders: Record<string, SQL> = {
  oldest: asc(issues.createdAt),
  newest: desc(issues.createdAt),
  most_voted: desc(issues.voteScore),
  trending: trendingOrder,
}

function issueListOrderBy(sortBy: string, fallback: IssueListSort): SQL {
  return sortOrders[sortBy] ?? sortOrders[fallback]!
}

// Shared tail of every issue/solution listing endpoint: filter, sort, load
// relations, transform for the card UI, attach the member avatar stacks.
export async function listIssueNodes(conditions: SQL[], sortBy: string, fallback: IssueListSort) {
  const results = await useDB().query.issues.findMany({
    where: and(...conditions),
    with: issueWithRelations,
    orderBy: issueListOrderBy(sortBy, fallback),
  })
  return withMembers(
    'issue',
    results.map((i) => transformIssue(i)),
  )
}
