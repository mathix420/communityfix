import { eq, sql, type SQL } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../database/schema'
import { issues, type IssueType } from '../database/schema'

// Accepts the plain db as well as a transaction handle, in the Nuxt server and
// the moderation worker alike (both are postgres-js drizzle over this schema).
type CounterExecutor = Pick<PostgresJsDatabase<typeof schema>, 'update'>

function parentCounterAdjustment(
  type: IssueType,
  delta: 1 | -1,
): { solutionCount: SQL } | { subIssueCount: SQL } {
  const column = type === 'solution' ? issues.solutionCount : issues.subIssueCount
  const value = delta === 1 ? sql`${column} + 1` : sql`GREATEST(${column} - 1, 0)`
  return type === 'solution' ? { solutionCount: value } : { subIssueCount: value }
}

// The denormalized child tallies on a parent node (`solutionCount` /
// `subIssueCount`) move whenever a child is created, re-parented, or flips
// between counted (pending/approved) and not counted (rejected). This is the
// single write path for those moves; `node` is the child (or, for re-parents,
// an explicit `{ parentId, type }` naming the parent gaining/losing it).
//
// No-ops on a null parentId. Decrements clamp at 0: a double-decrement (e.g.
// rejecting an already uncounted node after a race) must not drive a tally
// negative.
export async function adjustParentCounter(
  db: CounterExecutor,
  node: { parentId?: number | null; type: IssueType },
  delta: 1 | -1,
): Promise<void> {
  if (!node.parentId) return
  await db
    .update(issues)
    .set(parentCounterAdjustment(node.type, delta))
    .where(eq(issues.id, node.parentId))
}
