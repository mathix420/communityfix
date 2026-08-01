import type { H3Event } from 'h3'
import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import { caseStudies, issues, tags as tagsTable, issueTags } from '../../database/schema'
import {
  caseStudyWithSolutions,
  findCaseStudyIdsForSolutions,
  transformCaseStudy,
} from '../../utils/case-study-write'

function listParams(event: H3Event) {
  const q = getQuery(event)
  return {
    sortBy: (q.sort as string) || 'newest',
    trimmed: ((q.search as string) || '').trim(),
  }
}

// The ids of every node (issue or solution) carrying a tag.
async function taggedNodeIds(tagId: number) {
  const rows = await useDB().query.issueTags.findMany({
    where: eq(issueTags.tagId, tagId),
    columns: { issueId: true },
  })
  return rows.map((r) => r.issueId)
}

// Issues + solutions carrying the tag, in the caller's sort order. Filters
// (approved, non-spam) match `/api/tags` so the counts stay in sync.
async function tagIssueNodes(nodeIds: number[], trimmed: string, sortBy: string) {
  if (nodeIds.length === 0) return []
  const where = [
    inArray(issues.id, nodeIds),
    eq(issues.status, 'approved'),
    ne(issues.isSpam, true),
  ]
  if (trimmed) where.push(sql`search_vector @@ plainto_tsquery('english', ${trimmed})`)
  return listIssueNodes(where, sortBy, 'newest')
}

function caseStudyOrder(sortBy: string) {
  if (sortBy === 'oldest') return [asc(caseStudies.createdAt)]
  if (sortBy === 'newest') return [desc(caseStudies.createdAt)]
  return [desc(caseStudies.verified), desc(caseStudies.createdAt)]
}

// Case studies carry no tags of their own, so we surface them transitively: any
// study linked to any solution carrying the tag. A study may match several
// solutions, so relationship ids are deduplicated before hydration.
async function tagCaseStudies(nodeIds: number[], trimmed: string, sortBy: string) {
  if (nodeIds.length === 0) return []
  const caseStudyIds = await findCaseStudyIdsForSolutions(nodeIds)
  if (caseStudyIds.length === 0) return []
  const where = [
    inArray(caseStudies.id, caseStudyIds),
    eq(caseStudies.status, 'approved'),
    ne(caseStudies.isSpam, true),
  ]
  if (trimmed) where.push(sql`search_vector @@ plainto_tsquery('english', ${trimmed})`)
  const rows = await useDB().query.caseStudies.findMany({
    where: and(...where),
    with: caseStudyWithSolutions,
    orderBy: caseStudyOrder(sortBy),
  })
  return withMembers('case_study', rows.map(transformCaseStudy))
}

// Every node related to a tag, of any kind: the tagged issues (top-level or
// sub-issue) and solutions, plus the case studies of any tagged solution.
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Missing tag slug' })

  const { sortBy, trimmed } = listParams(event)

  const tag = await useDB().query.tags.findFirst({ where: eq(tagsTable.slug, slug) })
  if (!tag) return { tag: null, nodes: [], caseStudies: [] }

  const nodeIds = await taggedNodeIds(tag.id)
  const [nodes, studies] = await Promise.all([
    tagIssueNodes(nodeIds, trimmed, sortBy),
    tagCaseStudies(nodeIds, trimmed, sortBy),
  ])

  return { tag: { id: tag.id, slug: tag.slug, name: tag.name }, nodes, caseStudies: studies }
})
