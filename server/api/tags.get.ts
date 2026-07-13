import { and, eq, ne, sql } from 'drizzle-orm'
import { issues, issueTags, tags } from '../database/schema'

export default defineEventHandler(async () => {
  const db = useDB()
  // Exclude the 1536-dim `embedding` vector — no client needs it, and it would
  // otherwise dominate the payload (notably for the public OpenAPI/GPT Action).
  // `uses` counts approved, non-spam nodes so browse UIs can rank topics.
  return db
    .select({
      id: tags.id,
      slug: tags.slug,
      name: tags.name,
      createdAt: tags.createdAt,
      updatedAt: tags.updatedAt,
      uses: sql<number>`count(${issues.id})::int`,
    })
    .from(tags)
    .leftJoin(issueTags, eq(issueTags.tagId, tags.id))
    .leftJoin(
      issues,
      and(eq(issues.id, issueTags.issueId), eq(issues.status, 'approved'), ne(issues.isSpam, true)),
    )
    .groupBy(tags.id)
    .orderBy(sql`count(${issues.id}) DESC`, tags.name)
})
