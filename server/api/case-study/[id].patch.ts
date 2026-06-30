// Edit / propose-edit a case study. Owner/admin edits apply immediately
// (recorded as a born-approved revision); anyone else's edit lands as a pending
// proposal that leaves the live node untouched. Mirrors the issue PATCH routing
// — both share server/utils/revision-write.ts.
import { eq } from 'drizzle-orm'
import { caseStudies } from '../../database/schema'
import { transformCaseStudy, updateCaseStudy } from '../../utils/case-study-write'
import {
  diffSnapshots,
  editableCaseStudySnapshot,
  recordRevision,
  proposeRevision,
  type Snapshot,
} from '../../utils/revision-write'
import { resolveDecideRole } from '../../utils/node-members'
import { isSessionAdmin } from '../../utils/is-admin'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const id = getRouterParam(event, 'id')
  if (!id || isNaN(parseInt(id, 10))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid case study ID' })
  }
  const caseStudyId = parseInt(id, 10)

  const { note, ...fields } = await readBody<Record<string, unknown> & { note?: string | null }>(
    event,
  )

  const db = useDB()
  const node = await db.query.caseStudies.findFirst({ where: eq(caseStudies.id, caseStudyId) })
  if (!node) {
    throw createError({ statusCode: 404, statusMessage: `Case study ${caseStudyId} not found` })
  }

  const isAdmin = await isSessionAdmin(event)
  const role = await resolveDecideRole(session.user.id, 'case_study', caseStudyId, isAdmin)

  // Non-owner / non-admin: record a pending proposal instead of mutating.
  if (!role) {
    const changes = changesFromBody(fields, editableCaseStudySnapshot(node))
    const revision = await proposeRevision(
      session.user.id,
      { targetKind: 'case_study', targetId: caseStudyId, changes, note: note ?? null },
      event,
    )
    return { applied: false, revisionId: revision.id }
  }

  // Owner/admin: apply immediately via the single write path, then record a
  // born-approved revision. updateCaseStudy self-triggers re-moderation.
  const { caseStudy, before } = await updateCaseStudy(session.user.id, {
    id: caseStudyId,
    ...fields,
  })

  const after = editableCaseStudySnapshot(caseStudy)
  const changes = diffSnapshots(before, after)
  let revisionId: number | null = null
  if (Object.keys(changes).length > 0) {
    const revision = await recordRevision({
      targetKind: 'case_study',
      issueId: null,
      caseStudyId: caseStudy.id,
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

  const hydrated = await db.query.caseStudies.findFirst({
    where: eq(caseStudies.id, caseStudyId),
    with: { author: { columns: { name: true } } },
  })
  return { applied: true, revisionId, caseStudy: transformCaseStudy(hydrated!) }
})

// Translate the patch body into the snapshot-keyed `changes` map the proposal
// path expects. Every editable field forwards as-is; latitude/longitude collapse
// to the snapshot's `location: {latitude, longitude}` shape (merging with the
// current value so a one-axis edit keeps the other). Non-editable keys are
// dropped here and again by proposeRevision's own filter.
function changesFromBody(body: Record<string, unknown>, base: Snapshot): Snapshot {
  const changes: Snapshot = {}
  for (const key of Object.keys(base)) {
    if (key === 'location') continue
    if (key in body) changes[key] = body[key]
  }
  if ('latitude' in body || 'longitude' in body) {
    const baseLoc = base.location as { latitude: number; longitude: number } | null
    const lat = (body.latitude as number | null | undefined) ?? baseLoc?.latitude ?? null
    const lng = (body.longitude as number | null | undefined) ?? baseLoc?.longitude ?? null
    changes.location = lat != null && lng != null ? { latitude: lat, longitude: lng } : null
  }
  return changes
}
