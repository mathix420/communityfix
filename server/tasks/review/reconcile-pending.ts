import { sql } from 'drizzle-orm'
import { triggerModeration, type ModerationKind } from '../../utils/moderation-trigger'

// Safety net for moderation that never ran. A node flips to `pending` and the
// write path fires `triggerModeration`, but that call is best-effort: if the
// Workflow instance is never created (transient Cloudflare error, missing
// binding — both swallowed in moderation-trigger.ts) or the run dies before it
// records a verdict, the node is stranded `pending` with nothing to recover it.
// The Cloudflare Workflow gives durability *once a run exists*; this task is what
// guarantees a run eventually exists. It re-submits stuck nodes to the same
// durable Workflow, so a failed trigger heals itself within a cron cycle instead
// of waiting for an admin to click "Re-moderate".

// Nodes still `pending` this long after their last edit are treated as stuck:
// any in-flight review (Workflow steps retry for a few minutes) has had time to
// land a verdict. Below this we leave them alone to avoid double-firing a review
// that is simply still running. The task itself runs hourly.
const STUCK_GRACE_MINUTES = 30

// Cap how many Workflow instances one run may start, so a backlog (or a bug that
// strands many nodes at once) can't blow past Cloudflare's instance-creation
// limits in a single tick — the next run picks up the remainder.
const BATCH_LIMIT = 100

// A pending node is "stuck" when NO terminal moderation outcome exists at or
// after its last edit. The decision-action guard keeps nodes that are
// *deliberately* pending out of the set: a node flagged uncertain or asked for
// more info carries a `flag_uncertain` / `request_info` log dated after
// `updated_at`, so it is left for the human. `updated_at` moves only on a real
// edit (updateIssue/updateCaseStudy set it; the Workflow's own approve/curate/
// relocate writes do not), so a node edited after a prior verdict correctly
// re-qualifies as stuck if its re-trigger failed.
async function findStuckPending(): Promise<Array<{ kind: ModerationKind; id: number }>> {
  const db = useDB()
  return (await db.execute(sql`
    SELECT 'issue'::text AS kind, i.id AS id, i.updated_at AS updated_at
    FROM issues i
    WHERE i.status = 'pending'
      AND i.updated_at < NOW() - (${STUCK_GRACE_MINUTES}::int * INTERVAL '1 minute')
      AND NOT EXISTS (
        SELECT 1 FROM audit_logs a
        WHERE a.issue_id = i.id
          AND a.action IN ('approve', 'reject', 'flag_spam', 'flag_duplicate', 'flag_uncertain', 'request_info')
          AND a.created_at >= i.updated_at
      )
    UNION ALL
    SELECT 'case-study'::text AS kind, cs.id AS id, cs.updated_at AS updated_at
    FROM case_studies cs
    WHERE cs.status = 'pending'
      AND cs.updated_at < NOW() - (${STUCK_GRACE_MINUTES}::int * INTERVAL '1 minute')
      AND NOT EXISTS (
        SELECT 1 FROM audit_logs a
        WHERE a.details->>'caseStudyId' = cs.id::text
          AND a.action IN ('approve', 'reject', 'flag_spam', 'flag_duplicate', 'flag_uncertain', 'request_info')
          AND a.created_at >= cs.updated_at
      )
    ORDER BY updated_at ASC
    LIMIT ${BATCH_LIMIT}
  `)) as unknown as Array<{ kind: ModerationKind; id: number }>
}

export default defineTask({
  meta: {
    name: 'review:reconcile-pending',
    description:
      'Re-submit nodes stuck in pending (review never completed) to the moderation Workflow',
  },
  async run() {
    // Scheduled tasks run without an h3 event — scope one DB client across the
    // nested useDB() calls (matches compute:trust-scores / oauth:purge).
    return withScopedDB(async () => {
      const stuck = await findStuckPending()
      // Fire sequentially — cheap `Workflow.create()` calls, and serial submission
      // is gentler on the instance-creation rate limit than a burst.
      for (const node of stuck) await triggerModeration(node.kind, node.id)
      if (stuck.length) {
        console.log(
          `[review:reconcile-pending] re-triggered ${stuck.length}: ${stuck
            .map((n) => `${n.kind}#${n.id}`)
            .join(', ')}`,
        )
      }
      return { result: `Re-triggered ${stuck.length} stuck node(s)`, nodes: stuck }
    })
  },
})
