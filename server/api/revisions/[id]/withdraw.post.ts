// Proposer (or an admin) withdraws their own pending proposal. withdrawRevision
// enforces the proposer-or-admin gate (403 otherwise) and marks the revision
// withdrawn.
import { withdrawRevision, serializeRevision } from '../../../utils/revision-write'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const revisionId = requireIdParam(event, { label: 'revision' })

  const revision = await withdrawRevision(session.user.id, revisionId)
  return { success: true, revision: revision ? serializeRevision(revision) : null }
})
