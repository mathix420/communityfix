import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { issues, auditLogs, type IssueType, ISSUE_TYPES } from '../../../../database/schema'
import { createAuditLog } from '../../../../utils/audit-log'
import { triggerModeration } from '../../../../utils/moderation-trigger'

interface IssueEdits {
  title?: string
  summary?: string
  description?: string | null
  type?: IssueType
}

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDB()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<{ reason?: string; edits?: IssueEdits }>(event)

  const issue = await db.query.issues.findFirst({ where: eq(issues.id, id) })
  if (!issue) {
    throw createError({ statusCode: 404, message: 'Issue not found' })
  }
  if (issue.status === 'approved') {
    throw createError({ statusCode: 400, message: 'Issue is already approved' })
  }

  const editsBefore: Record<string, unknown> = {}
  const editsAfter: Record<string, unknown> = {}
  const updates: Record<string, unknown> = {
    status: 'approved',
    rejectionReason: null,
    rejectedAt: null,
    isSpam: false,
    appealStatus: null,
    appealReason: null,
    appealedAt: null,
  }

  if (body.edits) {
    const e = body.edits
    if (e.title !== undefined) {
      const trimmed = e.title.trim()
      if (!trimmed) throw createError({ statusCode: 400, message: 'Title cannot be empty' })
      if (trimmed !== issue.title) {
        editsBefore.title = issue.title
        editsAfter.title = trimmed
        updates.title = trimmed
      }
    }
    if (e.summary !== undefined) {
      const trimmed = e.summary.trim()
      if (!trimmed) throw createError({ statusCode: 400, message: 'Summary cannot be empty' })
      if (trimmed.length > 280)
        throw createError({ statusCode: 400, message: 'Summary must be 280 characters or fewer' })
      if (trimmed !== issue.summary) {
        editsBefore.summary = issue.summary
        editsAfter.summary = trimmed
        updates.summary = trimmed
      }
    }
    if (e.description !== undefined && e.description !== issue.description) {
      editsBefore.description = issue.description
      editsAfter.description = e.description
      updates.description = e.description
    }
    if (e.type !== undefined) {
      if (!ISSUE_TYPES.includes(e.type)) {
        throw createError({ statusCode: 400, message: 'Invalid issue type' })
      }
      if (e.type !== issue.type) {
        editsBefore.type = issue.type
        editsAfter.type = e.type
        updates.type = e.type
      }
    }
  }

  await db.update(issues).set(updates).where(eq(issues.id, id))

  if (issue.parentId) {
    const effectiveType = (updates.type as IssueType | undefined) ?? issue.type
    const counter =
      effectiveType === 'solution'
        ? { solutionCount: sql`${issues.solutionCount} + 1` }
        : { subIssueCount: sql`${issues.subIssueCount} + 1` }
    await db.update(issues).set(counter).where(eq(issues.id, issue.parentId))
  }

  await createAuditLog({
    type: 'admin_override',
    action: 'override_approve',
    issueId: id,
    userId: issue.authorId,
    reason: body.reason || 'Admin force-approved',
    details: {
      adminId: session.user.id,
      previousStatus: issue.status,
      ...(Object.keys(editsBefore).length ? { editsBefore, editsAfter } : {}),
    },
  })

  await db
    .update(auditLogs)
    .set({
      status: 'overridden',
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      reviewNote: body.reason || null,
    })
    .where(and(eq(auditLogs.issueId, id), eq(auditLogs.status, 'needs_review')))

  if (issue.authorId) {
    await updateUserTrustScore(issue.authorId)
  }

  await triggerModeration('structure', id)

  return { success: true }
})
