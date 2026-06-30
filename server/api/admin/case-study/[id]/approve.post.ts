import { eq, and, sql } from 'drizzle-orm'
import {
  caseStudies,
  auditLogs,
  type CaseStudyOutcome,
  CASE_STUDY_OUTCOMES,
} from '../../../../database/schema'
import { createAuditLog } from '../../../../utils/audit-log'

interface CaseStudyEdits {
  description?: string | null
  implementer?: string | null
  locationName?: string
  outcome?: CaseStudyOutcome
}

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDB()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<{ reason?: string; edits?: CaseStudyEdits }>(event)

  const cs = await db.query.caseStudies.findFirst({ where: eq(caseStudies.id, id) })
  if (!cs) {
    throw createError({ statusCode: 404, message: 'Case study not found' })
  }
  if (cs.status === 'approved') {
    throw createError({ statusCode: 400, message: 'Case study is already approved' })
  }

  const editsBefore: Record<string, unknown> = {}
  const editsAfter: Record<string, unknown> = {}
  const updates: Record<string, unknown> = {
    status: 'approved',
    rejectionReason: null,
    rejectedAt: null,
    isSpam: false,
  }

  if (body.edits) {
    const e = body.edits
    if (e.outcome !== undefined) {
      if (!CASE_STUDY_OUTCOMES.includes(e.outcome)) {
        throw createError({ statusCode: 400, message: 'Invalid outcome' })
      }
      if (e.outcome !== cs.outcome) {
        editsBefore.outcome = cs.outcome
        editsAfter.outcome = e.outcome
        updates.outcome = e.outcome
      }
    }
    if (e.description !== undefined && e.description !== cs.description) {
      editsBefore.description = cs.description
      editsAfter.description = e.description
      updates.description = e.description
    }
    if (e.implementer !== undefined && e.implementer !== cs.implementer) {
      editsBefore.implementer = cs.implementer
      editsAfter.implementer = e.implementer
      updates.implementer = e.implementer
    }
    if (
      e.locationName !== undefined &&
      e.locationName.trim() &&
      e.locationName !== cs.locationName
    ) {
      editsBefore.locationName = cs.locationName
      editsAfter.locationName = e.locationName
      updates.locationName = e.locationName
    }
  }

  await db.update(caseStudies).set(updates).where(eq(caseStudies.id, id))

  await createAuditLog({
    type: 'admin_override',
    action: 'override_approve',
    userId: cs.authorId,
    reason: body.reason || 'Admin force-approved case study',
    details: {
      adminId: session.user.id,
      caseStudyId: id,
      solutionId: cs.solutionId,
      previousStatus: cs.status,
      ...(Object.keys(editsBefore).length ? { editsBefore, editsAfter } : {}),
    },
  })

  // Close any open needs_review logs targeting this case study (no FK column —
  // case study ids live in details.caseStudyId).
  await db
    .update(auditLogs)
    .set({
      status: 'overridden',
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      reviewNote: body.reason || null,
    })
    .where(
      and(
        eq(auditLogs.status, 'needs_review'),
        sql`(${auditLogs.details}->>'caseStudyId')::int = ${id}`,
      ),
    )

  if (cs.authorId) {
    await updateUserTrustScore(cs.authorId)
  }

  return { success: true }
})
