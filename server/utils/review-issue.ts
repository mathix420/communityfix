import { eq, sql } from 'drizzle-orm'
import { issues, tags, sdgs, issueTags, issueSdgs } from '../database/schema'
import { chatJson } from './openai'

interface ModerationResult {
  approved: boolean
  reason: string
  isSpam: boolean
}

interface TagResult {
  existingTagIds: number[]
  newTagNames: string[]
}

interface SdgResult {
  sdgIds: number[]
}

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

  const [allTags, allSdgs] = await Promise.all([
    db.select().from(tags),
    db.select().from(sdgs),
  ])

  const issueText = [
    `Title: ${issue.title}`,
    `Description: ${issue.description}`,
    issue.detailedDescription ? `Details: ${issue.detailedDescription}` : '',
  ].filter(Boolean).join('\n')

  let moderation: ModerationResult
  let tagResult: TagResult
  let sdgResult: SdgResult

  try {
    [moderation, tagResult, sdgResult] = await Promise.all([
      chatJson<ModerationResult>({
        system: 'You are a content moderator for a community problem-solving platform. Evaluate if this submission is a legitimate community issue. Reject spam, gibberish, hate speech, or off-topic content. Set isSpam to true for spam, gibberish, or bot content; false for off-topic or low-quality content that was submitted in good faith. Respond with JSON: { "approved": boolean, "reason": string, "isSpam": boolean }',
        user: issueText,
        context: `moderation for issue ${issueId}`,
      }),
      chatJson<TagResult>({
        system: `You classify community issues into relevant tags. Pick 1-3 tags from the provided list that best describe this issue. If no existing tag fits, suggest one new tag name. Respond with JSON: { "existingTagIds": number[], "newTagNames": string[] }\n\nAvailable tags:\n${allTags.map(t => `- id:${t.id} "${t.name}"`).join('\n')}`,
        user: issueText,
        context: `tag classification for issue ${issueId}`,
      }),
      chatJson<SdgResult>({
        system: `You map community issues to relevant UN Sustainable Development Goals. Pick 1-3 SDGs that this issue relates to. Respond with JSON: { "sdgIds": number[] }\n\nAvailable SDGs:\n${allSdgs.map(s => `- id:${s.id} "${s.name}"`).join('\n')}`,
        user: issueText,
        context: `SDG mapping for issue ${issueId}`,
      }),
    ])
  }
  catch (err) {
    console.error(`[review-issue] AI review failed for issue ${issueId}:`, err)
    throw err
  }

  if (!moderation.approved) {
    if (issue.parentId) {
      const counter = issue.type === 'solution'
        ? { solutionCount: sql`MAX(${issues.solutionCount} - 1, 0)` }
        : { subIssueCount: sql`MAX(${issues.subIssueCount} - 1, 0)` }
      await db.update(issues)
        .set(counter)
        .where(eq(issues.id, issue.parentId))
    }
    await db.update(issues)
      .set({
        status: 'rejected',
        rejectionReason: moderation.reason,
        rejectedAt: new Date().toISOString(),
        isSpam: moderation.isSpam ?? false,
      })
      .where(eq(issues.id, issueId))
    if (issue.authorId) {
      await checkAndApplyBan(issue.authorId)
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
  const validTagIds = allTagIds.filter(id => allTags.some(t => t.id === id) || newTagIds.includes(id))
  const validSdgIds = (sdgResult.sdgIds ?? []).filter(id => allSdgs.some(s => s.id === id))

  await db.batch([
    db.update(issues).set({ status: 'approved' }).where(eq(issues.id, issueId)),
    ...(validTagIds.length
      ? [db.insert(issueTags).values(validTagIds.map(tagId => ({ issueId, tagId })))]
      : []),
    ...(validSdgIds.length
      ? [db.insert(issueSdgs).values(validSdgIds.map(sdgId => ({ issueId, sdgId })))]
      : []),
  ] as any)
}
