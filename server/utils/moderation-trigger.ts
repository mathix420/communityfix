export type ModerationKind = 'issue' | 'case-study' | 'structure'

interface WorkflowBinding {
  create(options: { params: { kind: ModerationKind, id: number } }): Promise<{ id: string }>
}

function getWorkflowBinding(): WorkflowBinding | undefined {
  const env = (globalThis as { __env__?: { MODERATION_WORKFLOW?: WorkflowBinding } }).__env__
  return env?.MODERATION_WORKFLOW
}

export async function triggerModeration(kind: ModerationKind, id: number): Promise<void> {
  const workflow = getWorkflowBinding()
  if (!workflow) {
    console.warn(`[moderation] no MODERATION_WORKFLOW binding — skipping ${kind} #${id}`)
    return
  }
  try {
    await workflow.create({ params: { kind, id } })
  }
  catch (err) {
    console.error(`[moderation] failed to start workflow for ${kind} #${id}:`, err)
  }
}
