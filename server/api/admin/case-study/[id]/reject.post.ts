import { eq } from 'drizzle-orm'
import { caseStudies } from '../../../../database/schema'
import { createAuditLog } from '../../../../utils/audit-log'
import { reconcileNodeInBackground } from '../../../../utils/standard-site'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDB()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<{ reason: string }>(event)

  if (!body.reason?.trim()) {
    throw createError({ statusCode: 400, message: 'Rejection reason is required' })
  }

  const cs = await db.query.caseStudies.findFirst({ where: eq(caseStudies.id, id) })
  if (!cs) {
    throw createError({ statusCode: 404, message: 'Case study not found' })
  }
  if (cs.status === 'rejected') {
    throw createError({ statusCode: 400, message: 'Case study is already rejected' })
  }

  await db.update(caseStudies)
    .set({
      status: 'rejected',
      rejectionReason: body.reason.trim(),
      rejectedAt: new Date(),
    })
    .where(eq(caseStudies.id, id))

  await createAuditLog({
    type: 'admin_override',
    action: 'override_reject',
    userId: cs.authorId,
    reason: body.reason.trim(),
    details: { adminId: session.user.id, caseStudyId: id, solutionId: cs.solutionId, previousStatus: cs.status },
  })

  if (cs.authorId) {
    await updateUserTrustScore(cs.authorId)
  }

  // Rejected → remove any standard.site document for this case study.
  reconcileNodeInBackground('case_study', id)

  return { success: true }
})
