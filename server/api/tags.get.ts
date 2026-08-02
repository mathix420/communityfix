import { and, eq, ne, sql } from 'drizzle-orm'
import { caseStudies, caseStudySolutions, issues, issueTags, tags } from '../database/schema'

export default defineEventHandler(async () => {
  const db = useDB()
  // Exclude the 1536-dim `embedding` vector — no client needs it, and it would
  // otherwise dominate the payload (notably for the public OpenAPI/GPT Action).
  // `uses` counts every approved, non-spam node a tag reaches so browse UIs can
  // rank topics: the tagged issues/solutions plus the case studies attached to
  // those tagged solutions. This matches what `/tag/[slug]` lists, so the badge
  // equals the page total. The case-study join multiplies solution rows, hence
  // the `distinct` counts.
  const uses = sql<number>`(count(distinct ${issues.id}) + count(distinct ${caseStudies.id}))::int`
  return db
    .select({
      id: tags.id,
      slug: tags.slug,
      name: tags.name,
      createdAt: tags.createdAt,
      updatedAt: tags.updatedAt,
      uses,
    })
    .from(tags)
    .leftJoin(issueTags, eq(issueTags.tagId, tags.id))
    .leftJoin(
      issues,
      and(eq(issues.id, issueTags.issueId), eq(issues.status, 'approved'), ne(issues.isSpam, true)),
    )
    .leftJoin(caseStudySolutions, eq(caseStudySolutions.solutionId, issues.id))
    .leftJoin(
      caseStudies,
      and(
        eq(caseStudies.id, caseStudySolutions.caseStudyId),
        eq(caseStudies.status, 'approved'),
        ne(caseStudies.isSpam, true),
      ),
    )
    .groupBy(tags.id)
    .orderBy(
      sql`(count(distinct ${issues.id}) + count(distinct ${caseStudies.id})) DESC`,
      tags.name,
    )
})
