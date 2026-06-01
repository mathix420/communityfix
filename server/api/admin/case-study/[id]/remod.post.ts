import { eq } from 'drizzle-orm'
import { caseStudies } from '../../../../database/schema'
import { createAuditLog } from '../../../../utils/audit-log'
import { triggerModeration } from '../../../../utils/moderation-trigger'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDB()
  const id = Number(getRouterParam(event, 'id'))

  const cs = await db.query.caseStudies.findFirst({ where: eq(caseStudies.id, id) })
  if (!cs) {
    throw createError({ statusCode: 404, message: 'Case study not found' })
  }

  const previousStatus = cs.status

  await db.update(caseStudies)
    .set({
      status: 'pending',
      rejectionReason: null,
      rejectedAt: null,
      isSpam: false,
      embedding: null,
    })
    .where(eq(caseStudies.id, id))

  await createAuditLog({
    type: 'admin_override',
    action: 'remod',
    status: 'auto_resolved',
    userId: cs.authorId,
    reason: `Admin triggered re-moderation on case study (was ${previousStatus})`,
    details: { adminId: session.user.id, caseStudyId: id, solutionId: cs.solutionId, previousStatus },
  })

  await triggerModeration('case-study', id)

  return { success: true }
})
