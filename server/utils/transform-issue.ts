import type { InferSelectModel } from 'drizzle-orm'
import type { issues, tags, sdgs } from '../database/schema'

type DbIssue = InferSelectModel<typeof issues> & {
  issueTags: { tag: InferSelectModel<typeof tags> }[]
  issueSdgs: { sdg: InferSelectModel<typeof sdgs> }[]
}

export const issueWithRelations = {
  issueTags: { with: { tag: true } },
  issueSdgs: { with: { sdg: true } },
} as const

export function transformIssue(issue: DbIssue, { includeModeration = false } = {}) {
  if (!issue.createdAt) {
    throw new Error(`[transformIssue] Issue ${issue.id} has no createdAt — refusing to serialize a corrupt row`)
  }
  return {
    id: issue.id,
    parentId: issue.parentId,
    title: issue.title,
    description: issue.description,
    detailedDescription: issue.detailedDescription,
    authorId: issue.authorId,
    author: issue.authorName ?? 'Anonymous',
    date: issue.createdAt.toISOString().slice(0, 10),
    solutionCount: issue.solutionCount,
    subIssueCount: issue.subIssueCount,
    voteScore: issue.voteScore,
    status: issue.status,
    type: issue.type,
    solutionStatus: issue.solutionStatus,
    tags: issue.issueTags.map(it => it.tag.slug),
    sustainableDevelopmentGoals: issue.issueSdgs.map(is => ({
      id: is.sdg.id,
      name: is.sdg.name,
      iconUrl: is.sdg.iconUrl,
      link: is.sdg.link,
    })),
    locationName: issue.locationName,
    location: issue.location ? {
      latitude: (issue.location as { x: number, y: number }).y,
      longitude: (issue.location as { x: number, y: number }).x,
    } : null,
    scale: issue.scale,
    ...(includeModeration && {
      rejectionReason: issue.rejectionReason,
      rejectedAt: issue.rejectedAt,
      isSpam: issue.isSpam,
      appealReason: issue.appealReason,
      appealStatus: issue.appealStatus,
      appealedAt: issue.appealedAt,
    }),
  }
}
