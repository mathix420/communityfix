import { sql } from 'drizzle-orm'

// Recursion caps. A per-parent cap prevents a wide root from crowding out
// grandchildren under the global node cap.
const MAX_DEPTH = 10
const MAX_PER_PARENT = 20
const MAX_NODES = 500

interface TreeRow {
  id: number
  parent_id: number | null
  title: string
  type: 'issue' | 'solution'
  solution_status: 'plan' | 'in-progress' | 'done' | null
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

export async function getIssueTree(rootId: number): Promise<TreeNode[]> {
  const db = useDB()
  const rows = await db.execute<TreeRow & Record<string, unknown>>(sql`
    WITH RECURSIVE ranked_issues AS (
      SELECT
        i.id, i.parent_id, i.title, i.type, i.solution_status, i.status,
        i.vote_score, i.solution_count, i.sub_issue_count,
        u.name AS author_name,
        ROW_NUMBER() OVER (PARTITION BY i.parent_id ORDER BY i.vote_score DESC, i.id ASC) AS sibling_rank
      FROM issues i
      LEFT JOIN users u ON u.id = i.author_id
      WHERE i.status <> 'rejected'
    ),
    tree AS (
      SELECT id, parent_id, title, type, solution_status, vote_score,
             solution_count, sub_issue_count, author_name, 1 AS depth
      FROM ranked_issues
      WHERE parent_id = ${rootId} AND sibling_rank <= ${MAX_PER_PARENT}
      UNION ALL
      SELECT i.id, i.parent_id, i.title, i.type, i.solution_status, i.vote_score,
             i.solution_count, i.sub_issue_count, i.author_name, t.depth + 1
      FROM ranked_issues i
      INNER JOIN tree t ON i.parent_id = t.id
      WHERE t.depth < ${MAX_DEPTH} AND i.sibling_rank <= ${MAX_PER_PARENT}
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
}
