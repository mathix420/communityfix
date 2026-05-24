import { eq, sql } from 'drizzle-orm'
import { issues } from '../database/schema'
import { chatJson } from './ai'
import { findSimilar } from './embeddings'
import { createAuditLog } from './audit-log'

interface StructureVerdict {
  action: 'none' | 'duplicate' | 'reparent' | 'convert_to_case_study'
  targetId: number | null
  reason: string
}

export async function reviewStructure(issueId: number) {
  const db = useDB()

  const issue = await db.query.issues.findFirst({
    where: eq(issues.id, issueId),
  })
  if (!issue || issue.status !== 'approved' || !issue.embedding) return

  const issueText = [
    `[${issue.type}] Title: ${issue.title}`,
    `Summary: ${issue.summary}`,
    issue.description ? `Description: ${issue.description}` : '',
  ].filter(Boolean).join('\n')

  const similarIssues = await findSimilar<{
    id: number
    type: string
    title: string
    summary: string
    parentId: number | null
    similarity: number
  }>({
    table: 'issues',
    columns: 'id, type, title, summary, parent_id AS "parentId"',
    embedding: issue.embedding as number[],
    where: sql`status = 'approved' AND id <> ${issueId}`,
    limit: 10,
    threshold: 0.6,
  })

  if (similarIssues.length === 0) return

  const parentIds = [...new Set(similarIssues.map(s => s.parentId).filter(Boolean))] as number[]
  let parents: Array<{ id: number, title: string, type: string }> = []
  if (parentIds.length > 0) {
    parents = await db.execute<{ id: number, title: string, type: string }>(
      sql`SELECT id, title, type FROM issues WHERE id = ANY(${parentIds}) AND status = 'approved'`,
    ) as unknown as Array<{ id: number, title: string, type: string }>
  }

  const contextLines = similarIssues.map((s) => {
    const parentLabel = s.parentId
      ? ` (child of #${s.parentId}: "${parents.find(p => p.id === s.parentId)?.title ?? '?'}")`
      : ' (top-level)'
    return `- #${s.id} [${s.type}] "${s.title}" — ${s.summary} | similarity: ${(s.similarity * 100).toFixed(0)}%${parentLabel}`
  }).join('\n')

  const verdict = await chatJson<StructureVerdict>({
    system: `You are a structural reviewer for a community problem-solving platform that organizes issues and solutions in a tree.

The tree has two node types:
- **issue**: a problem or sub-problem. Issues can nest (sub-issues under a parent issue).
- **solution**: a proposed approach to solve a parent issue. Solutions are always leaves.

A separate entity — **case study** — documents a real-world deployment of a solution (specific location, dates, outcomes, metrics). Case studies are NOT part of the issue/solution tree; they attach to a solution.

You are given a newly approved item and a list of existing similar items. Decide the best structural action:

1. **none** — the item is correctly placed, no changes needed.
2. **duplicate** — the item is essentially the same as an existing item (same scope, same angle). Set targetId to the existing item's id.
3. **reparent** — the item should be a child (sub-issue or solution) of an existing issue. Set targetId to that parent issue's id. Only suggest this for top-level items that clearly belong under an existing issue.
4. **convert_to_case_study** — the item is typed as a solution but actually describes a specific real-world implementation (mentions a specific place, organization, dates, outcomes, or measured results). It should be a case study instead. Set targetId to the existing solution it documents, or to the parent issue if no matching solution exists.

Be conservative: only suggest an action when the evidence is clear. When in doubt, choose "none".`,
    user: `New item (id: ${issue.id}, type: ${issue.type}, parentId: ${issue.parentId ?? 'none'}):\n${issueText}\n\nExisting similar items:\n${contextLines}`,
    schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['none', 'duplicate', 'reparent', 'convert_to_case_study'] },
        targetId: { type: ['integer', 'null'] },
        reason: { type: 'string' },
      },
      required: ['action', 'targetId', 'reason'],
      additionalProperties: false,
    },
    context: `structural review for ${issue.type} ${issueId}`,
  })

  if (verdict.action === 'none') return

  console.log(`[review-structure] ${issue.type} #${issueId}: ${verdict.action} → #${verdict.targetId} — ${verdict.reason}`)

  if (verdict.action === 'duplicate') {
    await rejectIssue(db, issue, `Duplicate of #${verdict.targetId}: ${verdict.reason}`)
    await createAuditLog({
      type: 'structure',
      action: 'flag_duplicate',
      issueId,
      userId: issue.authorId,
      reason: verdict.reason,
      details: { targetId: verdict.targetId },
    })
    return
  }

  if (verdict.action === 'reparent' && verdict.targetId && !issue.parentId) {
    const target = await db.query.issues.findFirst({
      where: eq(issues.id, verdict.targetId),
    })
    if (target && target.status === 'approved' && target.type === 'issue') {
      const counter = issue.type === 'solution'
        ? { solutionCount: sql`${issues.solutionCount} + 1` }
        : { subIssueCount: sql`${issues.subIssueCount} + 1` }
      await db.transaction(async (tx) => {
        await tx.update(issues)
          .set({ parentId: verdict.targetId })
          .where(eq(issues.id, issueId))
        await tx.update(issues)
          .set(counter)
          .where(eq(issues.id, verdict.targetId!))
      })
      await createAuditLog({
        type: 'structure',
        action: 'reparent',
        status: 'needs_review',
        issueId,
        reason: verdict.reason,
        details: { targetId: verdict.targetId, previousParentId: null },
      })
    }
    return
  }

  if (verdict.action === 'convert_to_case_study' && verdict.targetId && issue.type === 'solution') {
    await rejectIssue(db, issue, `This looks like a case study, not a solution. ${verdict.reason} Consider resubmitting as a case study on solution #${verdict.targetId}.`)
    await createAuditLog({
      type: 'structure',
      action: 'convert_to_case_study',
      status: 'needs_review',
      issueId,
      userId: issue.authorId,
      reason: verdict.reason,
      details: { targetId: verdict.targetId },
    })
  }
}

async function rejectIssue(db: ReturnType<typeof useDB>, issue: typeof issues.$inferSelect, reason: string) {
  if (issue.parentId) {
    const counter = issue.type === 'solution'
      ? { solutionCount: sql`GREATEST(${issues.solutionCount} - 1, 0)` }
      : { subIssueCount: sql`GREATEST(${issues.subIssueCount} - 1, 0)` }
    await db.update(issues)
      .set(counter)
      .where(eq(issues.id, issue.parentId))
  }
  await db.update(issues)
    .set({
      status: 'rejected',
      rejectionReason: reason,
      rejectedAt: new Date(),
    })
    .where(eq(issues.id, issue.id))
}
