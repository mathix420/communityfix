// Owner/admin approves a pending proposal. decideRevision enforces the
// owner-or-admin gate (403 otherwise), applies the change via the single write
// path, re-moderates, emails the proposer, and recomputes their trust score.
import { decideRevision, serializeRevision } from '../../../utils/revision-write'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const revisionId = requireIdParam(event, { label: 'revision' })
  const body = await readBody<{ reason?: string | null }>(event).catch(
    () => ({}) as { reason?: string | null },
  )

  const revision = await decideRevision(
    session.user.id,
    revisionId,
    'approve',
    body?.reason ?? null,
    event,
  )
  return { success: true, revision: revision ? serializeRevision(revision) : null }
})
