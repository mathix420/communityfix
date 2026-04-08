import { sql } from 'drizzle-orm'

// Cap recursion depth and total node count so a pathological tree (deep chain
// or massive fan-out) cannot blow up the response.
const MAX_DEPTH = 10
const MAX_NODES = 500

type TreeRow = {
  id: number
  parent_id: number | null
  title: string
  type: 'issue' | 'solution'
  solution_status: 'plan' | 'in-progress' | 'done' | null
  status: string
  vote_score: number
  solution_count: number
  sub_issue_count: number
  author_name: string | null
  depth: number
}

export interface TreeNode {
  id: number
  parentId: number | null
  title: string
  type: 'issue' | 'solution'
  solutionStatus: 'plan' | 'in-progress' | 'done' | null
  voteScore: number
  solutionCount: number
  subIssueCount: number
  author: string
  depth: number
}

export default defineEventHandler(async (event): Promise<TreeNode[]> => {
  const db = useDB()
  const id = getRouterParam(event, 'id')
  if (!id || isNaN(parseInt(id, 10))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid issue ID' })
  }
  const rootId = parseInt(id, 10)

  // Recursive CTE walks the parent_id self-reference downward from rootId.
  // Sibling order is vote_score DESC, id ASC so the most-supported children
  // surface first and ordering is stable across requests.
  const rows = await db.execute<TreeRow>(sql`
    WITH RECURSIVE tree AS (
      SELECT
        id, parent_id, title, type, solution_status, status,
        vote_score, solution_count, sub_issue_count, author_name,
        1 AS depth
      FROM issues
      WHERE parent_id = ${rootId}
        AND status = 'approved'
      UNION ALL
      SELECT
        i.id, i.parent_id, i.title, i.type, i.solution_status, i.status,
        i.vote_score, i.solution_count, i.sub_issue_count, i.author_name,
        t.depth + 1
      FROM issues i
      INNER JOIN tree t ON i.parent_id = t.id
      WHERE t.depth < ${MAX_DEPTH}
        AND i.status = 'approved'
    )
    SELECT * FROM tree
    ORDER BY depth ASC, vote_score DESC, id ASC
    LIMIT ${MAX_NODES}
  `)

  return (rows as unknown as TreeRow[]).map(r => ({
    id: r.id,
    parentId: r.parent_id,
    title: r.title,
    type: r.type,
    solutionStatus: r.solution_status,
    voteScore: r.vote_score,
    solutionCount: r.solution_count,
    subIssueCount: r.sub_issue_count,
    author: r.author_name ?? 'Anonymous',
    depth: r.depth,
  }))
})
