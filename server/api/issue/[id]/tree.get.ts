import { sql } from 'drizzle-orm'

// Cap recursion depth, per-parent fan-out, and total node count so a pathological
// tree cannot blow up the response. Per-parent cap prevents a wide root from
// crowding out grandchildren under the global node cap.
const MAX_DEPTH = 10
const MAX_PER_PARENT = 20
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

  // Rank siblings per-parent so the recursive walk can keep only the top N
  // children of each node, then walk the parent_id self-reference downward.
  // Sibling order is vote_score DESC, id ASC: most-supported first, stable.
  const rows = await db.execute<TreeRow>(sql`
    WITH RECURSIVE ranked_issues AS (
      SELECT
        id, parent_id, title, type, solution_status, status,
        vote_score, solution_count, sub_issue_count, author_name,
        ROW_NUMBER() OVER (
          PARTITION BY parent_id
          ORDER BY vote_score DESC, id ASC
        ) AS sibling_rank
      FROM issues
      WHERE status = 'approved'
    ),
    tree AS (
      SELECT
        id, parent_id, title, type, solution_status, status,
        vote_score, solution_count, sub_issue_count, author_name,
        1 AS depth
      FROM ranked_issues
      WHERE parent_id = ${rootId}
        AND sibling_rank <= ${MAX_PER_PARENT}
      UNION ALL
      SELECT
        i.id, i.parent_id, i.title, i.type, i.solution_status, i.status,
        i.vote_score, i.solution_count, i.sub_issue_count, i.author_name,
        t.depth + 1
      FROM ranked_issues i
      INNER JOIN tree t ON i.parent_id = t.id
      WHERE t.depth < ${MAX_DEPTH}
        AND i.sibling_rank <= ${MAX_PER_PARENT}
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
