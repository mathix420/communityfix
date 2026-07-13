import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import { caseStudies, issues, tags as tagsTable, issueTags } from '../../database/schema'
import { transformCaseStudy } from '../../utils/case-study-write'

// Every node related to a tag, of any kind. Tags attach to the `issues` table,
// which holds issues (type='issue', top-level or sub-issue) and solutions
// (type='solution'). Case studies carry no tags of their own, so we surface
// them transitively: any study attached to a solution that carries the tag.
// Filters (approved, non-spam) match `/api/tags` so the counts here sum to the
// `uses` badge shown on the topics index.
export default defineEventHandler(async (event) => {
  const db = useDB()
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Missing tag slug' })

  const query = getQuery(event)
  const sortBy = (query.sort as string) || 'newest'
  const trimmed = ((query.search as string) || '').trim()

  const tag = await db.query.tags.findFirst({ where: eq(tagsTable.slug, slug) })
  if (!tag) return { tag: null, nodes: [], caseStudies: [] }

  const tagInfo = { id: tag.id, slug: tag.slug, name: tag.name }

  const junctionRows = await db.query.issueTags.findMany({
    where: eq(issueTags.tagId, tag.id),
    columns: { issueId: true },
  })
  const issueIds = junctionRows.map((r) => r.issueId)
  if (issueIds.length === 0) return { tag: tagInfo, nodes: [], caseStudies: [] }

  // Issues + solutions carrying the tag.
  const conditions = [
    inArray(issues.id, issueIds),
    eq(issues.status, 'approved'),
    ne(issues.isSpam, true),
  ]
  if (trimmed) {
    conditions.push(sql`search_vector @@ plainto_tsquery('english', ${trimmed})`)
  }
  const nodes = await listIssueNodes(conditions, sortBy, 'newest')

  // Case studies attached to any tagged solution. `solution_id` only ever
  // points at a solution row, so intersecting with the tagged id set keeps
  // studies whose parent solution carries the tag.
  const csConditions = [
    inArray(caseStudies.solutionId, issueIds),
    eq(caseStudies.status, 'approved'),
    ne(caseStudies.isSpam, true),
  ]
  if (trimmed) {
    csConditions.push(sql`search_vector @@ plainto_tsquery('english', ${trimmed})`)
  }
  const csOrder =
    sortBy === 'oldest'
      ? [asc(caseStudies.createdAt)]
      : sortBy === 'newest'
        ? [desc(caseStudies.createdAt)]
        : [desc(caseStudies.verified), desc(caseStudies.createdAt)]
  const csRows = await db.query.caseStudies.findMany({
    where: and(...csConditions),
    with: {
      author: { columns: { name: true } },
      solution: { columns: { title: true, summary: true } },
    },
    orderBy: csOrder,
  })
  const studies = await withMembers('case_study', csRows.map(transformCaseStudy))

  return { tag: tagInfo, nodes, caseStudies: studies }
})
