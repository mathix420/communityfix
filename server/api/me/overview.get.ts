// Everything the dashboard bento needs in one cheap call: the signed-in user's
// profile basics, contribution counters (all COUNT(*), no row payloads), and
// the topics (tags) they're most active in. The review queue + proposal feed
// come from the shared revision-inbox composable, not here.
import { and, eq, ne, or, count, sql } from 'drizzle-orm'
import { issues, caseStudies, revisions, users, issueTags, tags } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id
  const db = useDB()

  const [profile, issueRows, solutionRows, caseStudyRows, mergedRows, openRows, topicRows] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, userId), columns: { name: true, trustScore: true, createdAt: true } }),
    db.select({ n: count() }).from(issues)
      .where(and(eq(issues.authorId, userId), eq(issues.type, 'issue'), ne(issues.status, 'rejected'))),
    db.select({ n: count() }).from(issues)
      .where(and(eq(issues.authorId, userId), eq(issues.type, 'solution'), ne(issues.status, 'rejected'))),
    db.select({ n: count() }).from(caseStudies)
      .where(eq(caseStudies.authorId, userId)),
    // Approved edits I proposed on nodes I did NOT author — real collaboration.
    db.select({ n: count() }).from(revisions)
      .leftJoin(issues, eq(issues.id, revisions.issueId))
      .leftJoin(caseStudies, eq(caseStudies.id, revisions.caseStudyId))
      .where(and(
        eq(revisions.proposerId, userId),
        eq(revisions.status, 'approved'),
        or(
          and(eq(revisions.targetKind, 'issue'), ne(issues.authorId, userId)),
          and(eq(revisions.targetKind, 'case_study'), ne(caseStudies.authorId, userId)),
        ),
      )),
    db.select({ n: count() }).from(revisions)
      .where(and(eq(revisions.proposerId, userId), eq(revisions.status, 'pending'))),
    // Tags across this user's own non-rejected issues/solutions, busiest first.
    db.select({ slug: tags.slug, n: sql<number>`count(*)::int` })
      .from(issueTags)
      .innerJoin(issues, eq(issues.id, issueTags.issueId))
      .innerJoin(tags, eq(tags.id, issueTags.tagId))
      .where(and(eq(issues.authorId, userId), ne(issues.status, 'rejected')))
      .groupBy(tags.slug)
      .orderBy(sql`count(*) desc`)
      .limit(8),
  ])

  return {
    name: profile?.name ?? null,
    trustScore: Number(profile?.trustScore ?? 0),
    memberSince: profile?.createdAt ?? null,
    issues: Number(issueRows[0]?.n ?? 0),
    solutions: Number(solutionRows[0]?.n ?? 0),
    caseStudies: Number(caseStudyRows[0]?.n ?? 0),
    editsMerged: Number(mergedRows[0]?.n ?? 0),
    openProposals: Number(openRows[0]?.n ?? 0),
    topics: topicRows.map(t => ({ slug: t.slug, count: Number(t.n) })),
  }
})
