// Single entry point for kicking off AI moderation. The moderation logic itself
// lives entirely in the standalone Workflow worker (workers/moderation/); the app
// only starts a durable Workflow instance whenever a node needs reviewing.

export type ModerationKind = 'issue' | 'case-study' | 'structure'

interface WorkflowBinding {
  create(options: { params: { kind: ModerationKind, id: number } }): Promise<{ id: string }>
}

// Nitro's cloudflare-module handler assigns the Worker env to `globalThis.__env__`
// on every invocation, which is the one place every code path can reach the
// bindings without threading the h3 event through.
function getWorkflowBinding(): WorkflowBinding | undefined {
  const env = (globalThis as { __env__?: { MODERATION_WORKFLOW?: WorkflowBinding } }).__env__
  return env?.MODERATION_WORKFLOW
}

/**
 * Start moderation for a node. Resolves once the durable Workflow instance has
 * been queued (a fast RPC), so callers can `await` it before returning their
 * response without waiting on the actual review. Never throws — a failure to
 * enqueue is logged, not surfaced to the user.
 */
export async function triggerModeration(kind: ModerationKind, id: number): Promise<void> {
  const workflow = getWorkflowBinding()

  if (!workflow) {
    // No binding (local dev / tests): the moderation logic runs in the standalone
    // Workflow worker, which isn't part of `nuxt dev`. Run `wrangler dev` inside
    // workers/moderation to exercise it locally.
    console.warn(`[moderation] no MODERATION_WORKFLOW binding — skipping ${kind} #${id} (handled by the Workflow worker in prod)`)
    return
  }

  try {
    await workflow.create({ params: { kind, id } })
  }
  catch (err) {
    console.error(`[moderation] failed to start workflow for ${kind} #${id}:`, err)
  }
}
