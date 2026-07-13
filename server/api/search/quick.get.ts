import { and, desc, eq, ne, sql } from 'drizzle-orm'
import { caseStudies, issues } from '../../database/schema'

const GROUP_LIMIT = 20

// Catalog-wide full-text search for the site search bar: issues, solutions,
// AND case studies in one round trip, grouped by kind. Uses the GIN-indexed
// `search_vector` columns, so it stays fast and needs no embeddings (unlike
// the semantic /api/search).
export default defineEventHandler(async (event) => {
  const q = ((getQuery(event).q as string) || '').trim()
  if (!q) return { issues: [], solutions: [], caseStudies: [] }

  const db = useDB()
  const tsQuery = sql`plainto_tsquery('english', ${q})`

  const nodes = await db.query.issues.findMany({
    where: and(ne(issues.status, 'rejected'), sql`search_vector @@ ${tsQuery}`),
    with: issueWithRelations,
    orderBy: [sql`ts_rank(search_vector, ${tsQuery}) DESC`, desc(issues.voteScore)],
    limit: GROUP_LIMIT * 2,
  })

  const studies = await db.query.caseStudies.findMany({
    where: and(eq(caseStudies.status, 'approved'), sql`search_vector @@ ${tsQuery}`),
    with: {
      author: { columns: { name: true } },
      solution: { columns: { title: true, summary: true } },
    },
    orderBy: [sql`ts_rank(search_vector, ${tsQuery}) DESC`, desc(caseStudies.createdAt)],
    limit: GROUP_LIMIT,
  })

  const transformed = nodes.map((n) => transformIssue(n))
  return {
    issues: transformed.filter((n) => n.type === 'issue').slice(0, GROUP_LIMIT),
    solutions: transformed.filter((n) => n.type === 'solution').slice(0, GROUP_LIMIT),
    caseStudies: studies.map(transformCaseStudy),
  }
})
