import { sql } from 'drizzle-orm'
import type { CaseStudyOutcome } from '../database/schema'

// Recursion caps. A per-parent cap prevents a wide root from crowding out
// grandchildren under the global node cap.
const MAX_DEPTH = 10
const MAX_PER_PARENT = 20
const MAX_NODES = 500

interface TreeRow {
  id: number
  parent_id: number | null
  title: string
  type: 'issue' | 'solution' | 'case-study'
  solution_status: 'plan' | 'in-progress' | 'done' | null
  outcome: CaseStudyOutcome | null
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
  type: 'issue' | 'solution' | 'case-study'
  solutionStatus: 'plan' | 'in-progress' | 'done' | null
  outcome: CaseStudyOutcome | null
  voteScore: number
  solutionCount: number
  subIssueCount: number
  author: string
  depth: number
}

// The CTE walks the issues table top-down. Case studies aren't in the
// issues recursion (they reference solutions by `solution_id`, not the
// shared `parent_id` chain), so they're tacked on as a second UNION
// branch keyed on the collected solution rows. `parentId` on a returned
// case-study row is the solution's id, so the client-side tree builder
// can attach them like any other child.
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
    ),
    case_study_children AS (
      SELECT
        cs.id, cs.solution_id AS parent_id, cs.location_name AS title,
        'case-study'::text AS type, NULL::text AS solution_status,
        cs.outcome, 0 AS vote_score, 0 AS solution_count, 0 AS sub_issue_count,
        u.name AS author_name, t.depth + 1 AS depth,
        ROW_NUMBER() OVER (PARTITION BY cs.solution_id ORDER BY cs.created_at DESC, cs.id ASC) AS sibling_rank
      FROM case_studies cs
      INNER JOIN tree t ON t.id = cs.solution_id AND t.type = 'solution'
      LEFT JOIN users u ON u.id = cs.author_id
      WHERE cs.status = 'approved'
    )
    SELECT id, parent_id, title, type, solution_status, NULL::text AS outcome,
           vote_score, solution_count, sub_issue_count, author_name, depth
    FROM tree
    UNION ALL
    SELECT id, parent_id, title, type, solution_status, outcome,
           vote_score, solution_count, sub_issue_count, author_name, depth
    FROM case_study_children
    WHERE sibling_rank <= ${MAX_PER_PARENT}
    ORDER BY depth ASC, vote_score DESC, id ASC
    LIMIT ${MAX_NODES}
  `)

  return (rows as unknown as TreeRow[]).map(r => ({
    id: r.id,
    parentId: r.parent_id,
    title: r.title,
    type: r.type,
    solutionStatus: r.solution_status,
    outcome: r.outcome,
    voteScore: r.vote_score,
    solutionCount: r.solution_count,
    subIssueCount: r.sub_issue_count,
    author: r.author_name ?? 'Anonymous',
    depth: r.depth,
  }))
}
