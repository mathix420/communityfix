import { sql } from 'drizzle-orm'

// Public catalog counts for the home page stat strip. One round-trip; every
// count only includes approved, non-spam content.
export default defineEventHandler(async () => {
  const db = useDB()
  const rows = (await db.execute(
    sql`SELECT
      (SELECT count(*) FROM issues WHERE type = 'issue' AND status = 'approved' AND is_spam != true)::int AS issues,
      (SELECT count(*) FROM issues WHERE type = 'solution' AND status = 'approved' AND is_spam != true)::int AS solutions,
      (SELECT count(*) FROM case_studies WHERE status = 'approved' AND is_spam != true)::int AS case_studies,
      (SELECT count(DISTINCT tag_id) FROM issue_tags it
        JOIN issues i ON i.id = it.issue_id
        WHERE i.status = 'approved' AND i.is_spam != true)::int AS topics`,
  )) as unknown as Array<{
    issues: number
    solutions: number
    case_studies: number
    topics: number
  }>

  const row = rows[0]
  return {
    issues: row?.issues ?? 0,
    solutions: row?.solutions ?? 0,
    caseStudies: row?.case_studies ?? 0,
    topics: row?.topics ?? 0,
  }
})
