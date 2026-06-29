// Edit / propose-edit an issue or solution. Owner/admin edits apply immediately
// (recorded as a born-approved revision); anyone else's edit lands as a pending
// proposal that leaves the live node untouched until the owner/admin decides.
// Mirrors the routing of the case-study PATCH and the MCP propose tools — all
// three share server/utils/revision-write.ts.
import { eq } from 'drizzle-orm'
import type { LocationScale, SolutionStatus } from '../../database/schema'
import { issues } from '../../database/schema'
import { updateIssue, type Link } from '../../utils/issue-write'
import {
  editableIssueSnapshot,
  diffSnapshots,
  recordRevision,
  proposeRevision,
  type Snapshot,
} from '../../utils/revision-write'
import { resolveDecideRole } from '../../utils/node-members'
import { isSessionAdmin } from '../../utils/is-admin'
import { triggerModeration } from '../../utils/moderation-trigger'

interface IssuePatchBody {
  title?: string
  summary?: string
  description?: string | null
  solutionStatus?: SolutionStatus | null
  locationName?: string | null
  latitude?: number | null
  longitude?: number | null
  scale?: LocationScale | null
  links?: Link[] | null
  parentId?: number | null
  note?: string | null
}

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const id = getRouterParam(event, 'id')
  if (!id || isNaN(parseInt(id, 10))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid issue ID' })
  }
  const issueId = parseInt(id, 10)

  const { note, ...fields } = await readBody<IssuePatchBody>(event)

  const db = useDB()
  const node = await db.query.issues.findFirst({ where: eq(issues.id, issueId) })
  if (!node) {
    throw createError({ statusCode: 404, statusMessage: `Issue ${issueId} not found` })
  }

  const isAdmin = await isSessionAdmin(event)
  const role = await resolveDecideRole(session.user.id, 'issue', issueId, isAdmin)

  // Non-owner / non-admin: record a pending proposal instead of mutating.
  if (!role) {
    const changes = changesFromBody(fields, editableIssueSnapshot(node))
    const revision = await proposeRevision(
      session.user.id,
      { targetKind: 'issue', targetId: issueId, changes, note: note ?? null },
      event,
    )
    return { applied: false, revisionId: revision.id }
  }

  // Owner/admin: apply immediately via the single write path, then record a
  // born-approved revision and fire re-moderation as needed.
  const { issue, before, contentChanged, parentChanged } = await updateIssue(session.user.id, {
    id: issueId,
    ...fields,
  })

  const after = editableIssueSnapshot(issue)
  const changes = diffSnapshots(before, after)
  let revisionId: number | null = null
  if (Object.keys(changes).length > 0) {
    const revision = await recordRevision({
      targetKind: 'issue',
      issueId: issue.id,
      caseStudyId: null,
      proposerId: session.user.id,
      status: 'approved',
      changes,
      baseSnapshot: before,
      appliedSnapshot: after,
      note: note ?? null,
      decidedById: session.user.id,
      decidedByRole: role,
    })
    revisionId = revision.id
  }

  if (contentChanged) await triggerModeration('issue', issue.id)
  if (parentChanged) await triggerModeration('structure', issue.id)

  return { applied: true, revisionId }
})

// Translate the patch body into the snapshot-keyed `changes` map the proposal
// path expects (location collapses to {latitude, longitude}; unknown keys are
// dropped by proposeRevision's own filter, but we only forward editable fields).
function changesFromBody(fields: Omit<IssuePatchBody, 'note'>, base: Snapshot): Snapshot {
  const changes: Snapshot = {}
  if (fields.title !== undefined) changes.title = fields.title
  if (fields.summary !== undefined) changes.summary = fields.summary
  if (fields.description !== undefined) changes.description = fields.description ?? null
  if (fields.solutionStatus !== undefined) changes.solutionStatus = fields.solutionStatus ?? null
  if (fields.locationName !== undefined) changes.locationName = fields.locationName ?? null
  if (fields.scale !== undefined) changes.scale = fields.scale ?? null
  if (fields.links !== undefined) changes.links = fields.links ?? null
  if (fields.parentId !== undefined) changes.parentId = fields.parentId ?? null
  if (fields.latitude !== undefined || fields.longitude !== undefined) {
    const baseLoc = base.location as { latitude: number, longitude: number } | null
    const lat = fields.latitude ?? baseLoc?.latitude ?? null
    const lng = fields.longitude ?? baseLoc?.longitude ?? null
    changes.location = (lat != null && lng != null) ? { latitude: lat, longitude: lng } : null
  }
  return changes
}
