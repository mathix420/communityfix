import { eq, sql } from 'drizzle-orm'
import { issues, tags, sdgs, issueTags, issueSdgs } from '../database/schema'
import { chatJson } from './ai'
import { generateEmbedding, findSimilar } from './embeddings'

interface ModerationResult {
  approved: boolean
  reason: string
  isSpam: boolean
  duplicateOfId?: number | null
}

interface TagResult {
  existingTagIds: number[]
  newTagNames: string[]
}

interface SdgResult {
  sdgIds: number[]
}

const DUPLICATE_THRESHOLD = 0.92

export async function reviewIssue(issueId: number) {
  const db = useDB()

  const issue = await db.query.issues.findFirst({
    where: eq(issues.id, issueId),
  })
  if (!issue) {
    console.error(`[review-issue] Issue ${issueId} not found`)
    return
  }

  if (issue.status !== 'pending') return

  const issueText = [
    `Title: ${issue.title}`,
    `Summary: ${issue.summary}`,
    issue.description ? `Description: ${issue.description}` : '',
  ].filter(Boolean).join('\n')

  // Generate embedding early so we can use it for both duplicate detection and storage
  let embedding: number[] | null = null
  try {
    embedding = await generateEmbedding(`${issue.title}\n${issue.summary}`)
  }
  catch (err) {
    console.error(`[review-issue] Embedding generation failed for issue ${issueId}:`, err)
  }

  let similarIssues: Array<{ id: number, title: string, summary: string, similarity: number }> = []
  if (embedding) {
    similarIssues = await findSimilar({
      table: 'issues',
      columns: 'id, title, summary',
      embedding,
      where: sql`status = 'approved' AND id <> ${issueId} AND type = ${issue.type}${issue.parentId ? sql` AND parent_id = ${issue.parentId}` : sql``}`,
      limit: 5,
      threshold: 0.75,
    })
  }

  const [allTags, allSdgs] = await Promise.all([
    db.select().from(tags),
    db.select().from(sdgs),
  ])

  const duplicateContext = similarIssues.length > 0
    ? `\n\nExisting similar issues (high similarity may indicate a duplicate):\n${similarIssues.map(s => `- [id:${s.id}, similarity:${(s.similarity * 100).toFixed(0)}%] "${s.title}" — ${s.summary}`).join('\n')}`
    : ''

  let moderation: ModerationResult
  let tagResult: TagResult
  let sdgResult: SdgResult

  try {
    [moderation, tagResult, sdgResult] = await Promise.all([
      chatJson<ModerationResult>({
        system: `You are a content moderator for a community problem-solving platform. Evaluate if this submission is a legitimate community issue. Reject spam, gibberish, hate speech, or off-topic content. Set isSpam to true for spam, gibberish, or bot content; false for off-topic or low-quality content that was submitted in good faith.

If the submission is very similar to an existing issue (similarity above 90%), set duplicateOfId to that issue's id and reject it as a duplicate — unless it adds a meaningfully different angle or scope.`,
        user: issueText + duplicateContext,
        schema: {
          type: 'object',
          properties: {
            approved: { type: 'boolean' },
            reason: { type: 'string' },
            isSpam: { type: 'boolean' },
            duplicateOfId: { type: ['integer', 'null'] },
          },
          required: ['approved', 'reason', 'isSpam', 'duplicateOfId'],
          additionalProperties: false,
        },
        context: `moderation for issue ${issueId}`,
      }),
      chatJson<TagResult>({
        system: `You classify community issues into relevant tags. Pick 1-3 tags from the provided list that best describe this issue. If no existing tag fits, suggest one new tag name.\n\nAvailable tags:\n${allTags.map(t => `- id:${t.id} "${t.name}"`).join('\n')}`,
        user: issueText,
        schema: {
          type: 'object',
          properties: {
            existingTagIds: { type: 'array', items: { type: 'integer' } },
            newTagNames: { type: 'array', items: { type: 'string' } },
          },
          required: ['existingTagIds', 'newTagNames'],
          additionalProperties: false,
        },
        context: `tag classification for issue ${issueId}`,
      }),
      chatJson<SdgResult>({
        system: `You map community issues to relevant UN Sustainable Development Goals. Pick 1-3 SDGs that this issue relates to.\n\nAvailable SDGs:\n${allSdgs.map(s => `- id:${s.id} "${s.name}"`).join('\n')}`,
        user: issueText,
        schema: {
          type: 'object',
          properties: {
            sdgIds: { type: 'array', items: { type: 'integer' } },
          },
          required: ['sdgIds'],
          additionalProperties: false,
        },
        context: `SDG mapping for issue ${issueId}`,
      }),
    ])
  }
  catch (err) {
    console.error(`[review-issue] AI review failed for issue ${issueId}:`, err)
    throw err
  }

  // Auto-reject obvious duplicates even if the LLM approved — the vector
  // similarity is a hard signal that doesn't need LLM judgement.
  const nearDuplicate = similarIssues.find(s => s.similarity >= DUPLICATE_THRESHOLD)
  if (nearDuplicate && moderation.approved) {
    moderation.approved = false
    moderation.reason = `Near-duplicate of existing issue #${nearDuplicate.id} (${(nearDuplicate.similarity * 100).toFixed(0)}% similarity)`
    moderation.duplicateOfId = nearDuplicate.id
  }

  if (!moderation.approved) {
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
        rejectionReason: moderation.reason,
        rejectedAt: new Date(),
        isSpam: moderation.isSpam ?? false,
      })
      .where(eq(issues.id, issueId))
    if (issue.authorId) {
      await checkAndApplyBan(issue.authorId)
      await updateUserTrustScore(issue.authorId)
    }
    return
  }

  const newTagIds: number[] = []
  for (const name of tagResult.newTagNames ?? []) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const [newTag] = await db.insert(tags).values({ name, slug }).onConflictDoNothing({ target: tags.slug }).returning()
    if (newTag) {
      newTagIds.push(newTag.id)
    }
    else {
      const existing = await db.query.tags.findFirst({ where: eq(tags.slug, slug) })
      if (existing) newTagIds.push(existing.id)
    }
  }

  const allTagIds = [...(tagResult.existingTagIds ?? []), ...newTagIds]
  const validTagIds = Array.from(new Set(
    allTagIds.filter(id => allTags.some(t => t.id === id) || newTagIds.includes(id)),
  ))
  const validSdgIds = Array.from(new Set(
    (sdgResult.sdgIds ?? []).filter(id => allSdgs.some(s => s.id === id)),
  ))

  await db.transaction(async (tx) => {
    await tx.update(issues)
      .set({ status: 'approved', ...(embedding ? { embedding } : {}) })
      .where(eq(issues.id, issueId))
    if (validTagIds.length) {
      await tx.insert(issueTags).values(validTagIds.map(tagId => ({ issueId, tagId })))
    }
    if (validSdgIds.length) {
      await tx.insert(issueSdgs).values(validSdgIds.map(sdgId => ({ issueId, sdgId })))
    }
  })

  if (issue.authorId) {
    await updateUserTrustScore(issue.authorId)
  }
}
