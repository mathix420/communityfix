// Owner/admin rejects a pending proposal with a reason. decideRevision enforces
// the owner-or-admin gate (403 otherwise), marks the revision rejected, emails
// the proposer, and recomputes their trust score.
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
    'reject',
    body?.reason ?? null,
    event,
  )
  return { success: true, revision: revision ? serializeRevision(revision) : null }
})
