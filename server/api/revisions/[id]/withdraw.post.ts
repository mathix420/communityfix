// Proposer (or an admin) withdraws their own pending proposal. withdrawRevision
// enforces the proposer-or-admin gate (403 otherwise) and marks the revision
// withdrawn.
import { withdrawRevision, serializeRevision } from '../../../utils/revision-write'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const id = getRouterParam(event, 'id')
  if (!id || isNaN(parseInt(id, 10))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid revision ID' })
  }

  const revision = await withdrawRevision(session.user.id, parseInt(id, 10))
  return { success: true, revision: revision ? serializeRevision(revision) : null }
})
