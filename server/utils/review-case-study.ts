import { eq } from 'drizzle-orm'
import { caseStudies, issues } from '../database/schema'
import { chatJson } from './ai'
import { createAuditLog } from './audit-log'

interface ModerationResult {
  approved: boolean
  reason: string
  isSpam: boolean
}

export async function reviewCaseStudy(caseStudyId: number) {
  const db = useDB()

  const cs = await db.query.caseStudies.findFirst({
    where: eq(caseStudies.id, caseStudyId),
  })
  if (!cs) {
    console.error(`[review-case-study] Case study ${caseStudyId} not found`)
    return
  }

  if (cs.status !== 'pending') return

  const solution = await db.query.issues.findFirst({
    where: eq(issues.id, cs.solutionId),
    columns: { title: true, summary: true },
  })

  const caseStudyText = [
    solution ? `Parent solution: ${solution.title}` : '',
    `Location: ${cs.locationName}`,
    `Outcome: ${cs.outcome}`,
    cs.scale ? `Scale: ${cs.scale}` : '',
    cs.implementer ? `Implementer: ${cs.implementer}` : '',
    cs.description ? `Description: ${cs.description}` : '',
    cs.fundingSource ? `Funding source: ${cs.fundingSource}` : '',
    Array.isArray(cs.lessonsLearned) && cs.lessonsLearned.length
      ? `Lessons learned: ${(cs.lessonsLearned as string[]).join('; ')}`
      : '',
  ].filter(Boolean).join('\n')

  let moderation: ModerationResult

  try {
    moderation = await chatJson<ModerationResult>({
      system: `You are a content moderator for a community problem-solving platform. You are reviewing a case study — a real-world implementation report attached to a solution.

Approve legitimate case studies that document real or plausible implementations with coherent details. Reject:
- Spam, gibberish, or bot-generated nonsense
- Hate speech, harassment, or offensive content
- Clearly fabricated or incoherent content that doesn't describe a real implementation
- Promotional spam disguised as a case study

Be permissive for good-faith submissions — even incomplete or brief case studies should be approved if they appear to describe a genuine effort.`,
      user: caseStudyText,
      schema: {
        type: 'object',
        properties: {
          approved: { type: 'boolean' },
          reason: { type: 'string' },
          isSpam: { type: 'boolean' },
        },
        required: ['approved', 'reason', 'isSpam'],
        additionalProperties: false,
      },
      context: `moderation for case study ${caseStudyId}`,
    })
  }
  catch (err) {
    console.error(`[review-case-study] AI review failed for case study ${caseStudyId}:`, err)
    throw err
  }

  if (!moderation.approved) {
    await db.update(caseStudies)
      .set({
        status: 'rejected',
        rejectionReason: moderation.reason,
        rejectedAt: new Date(),
        isSpam: moderation.isSpam ?? false,
      })
      .where(eq(caseStudies.id, caseStudyId))

    await createAuditLog({
      type: 'moderation',
      action: moderation.isSpam ? 'flag_spam' : 'reject',
      userId: cs.authorId,
      reason: moderation.reason,
      details: { caseStudyId, solutionId: cs.solutionId, isSpam: moderation.isSpam },
    })

    if (cs.authorId) {
      await checkAndApplyBan(cs.authorId)
      await updateUserTrustScore(cs.authorId)
    }
    return
  }

  await db.update(caseStudies)
    .set({ status: 'approved' })
    .where(eq(caseStudies.id, caseStudyId))

  await createAuditLog({
    type: 'moderation',
    action: 'approve',
    userId: cs.authorId,
    reason: moderation.reason,
    details: { caseStudyId, solutionId: cs.solutionId },
  })

  if (cs.authorId) {
    await updateUserTrustScore(cs.authorId)
  }
}
