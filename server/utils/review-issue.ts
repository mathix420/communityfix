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
  if (!issue) return

  const [allTags, allSdgs] = await Promise.all([
    db.select().from(tags),
    db.select().from(sdgs),
  ])

  const issueText = [
    `Title: ${issue.title}`,
    `Description: ${issue.description}`,
    issue.detailedDescription ? `Details: ${issue.detailedDescription}` : '',
  ].filter(Boolean).join('\n')

  const [moderation, tagResult, sdgResult] = await Promise.all([
    chatJson<ModerationResult>({
      system: 'You are a content moderator for a community problem-solving platform. Evaluate if this submission is a legitimate community issue. Reject spam, gibberish, hate speech, or off-topic content. Set isSpam to true for spam, gibberish, or bot content; false for off-topic or low-quality content that was submitted in good faith. Respond with JSON: { "approved": boolean, "reason": string, "isSpam": boolean }',
      user: issueText,
    }),
    chatJson<TagResult>({
      system: `You classify community issues into relevant tags. Pick 1-3 tags from the provided list that best describe this issue. If no existing tag fits, suggest one new tag name. Respond with JSON: { "existingTagIds": number[], "newTagNames": string[] }\n\nAvailable tags:\n${allTags.map(t => `- id:${t.id} "${t.name}"`).join('\n')}`,
      user: issueText,
    }),
    chatJson<SdgResult>({
      system: `You map community issues to relevant UN Sustainable Development Goals. Pick 1-3 SDGs that this issue relates to. Respond with JSON: { "sdgIds": number[] }\n\nAvailable SDGs:\n${allSdgs.map(s => `- id:${s.id} "${s.name}"`).join('\n')}`,
      user: issueText,
    }),
  ])

  if (!moderation.approved) {
    // Decrement the correct counter on the parent
    if (issue.parentId) {
      const counter = issue.type === 'solution'
        ? { solutionCount: sql`${issues.solutionCount} - 1` }
        : { subIssueCount: sql`${issues.subIssueCount} - 1` }
      await db.update(issues)
        .set(counter)
        .where(eq(issues.id, issue.parentId))
    }
    // Soft-reject: keep the issue but mark it as rejected
    await db.update(issues)
      .set({
        status: 'rejected',
        rejectionReason: moderation.reason,
        rejectedAt: new Date().toISOString(),
        isSpam: moderation.isSpam ?? false,
      })
      .where(eq(issues.id, issueId))
    // Check if user should be auto-banned
    if (issue.authorId) {
      await checkAndApplyBan(issue.authorId)
    }
    return
  }

  // Create new tags if suggested
  const newTagIds: number[] = []
  for (const name of tagResult.newTagNames ?? []) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const [newTag] = await db.insert(tags).values({ name, slug }).returning()
    newTagIds.push(newTag!.id)
  }

  const allTagIds = [...(tagResult.existingTagIds ?? []), ...newTagIds]

  // Validate tag IDs exist
  const validTagIds = allTagIds.filter(id => allTags.some(t => t.id === id) || newTagIds.includes(id))

  // Validate SDG IDs exist
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
