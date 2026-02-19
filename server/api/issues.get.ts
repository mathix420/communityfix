import { eq, isNull, and, inArray, ne } from 'drizzle-orm'
import { issues, tags as tagsTable, issueTags } from '../database/schema'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const query = getQuery(event)
  const tagFilter = query.tag as string | undefined

  if (tagFilter) {
    // Find the tag by slug
    const tag = await db.query.tags.findFirst({
      where: eq(tagsTable.slug, tagFilter),
    })
    if (!tag) return []

    // Find issue IDs linked to this tag
    const junctionRows = await db.query.issueTags.findMany({
      where: eq(issueTags.tagId, tag.id),
      columns: { issueId: true },
    })
    const issueIds = junctionRows.map(r => r.issueId)
    if (issueIds.length === 0) return []

    // Fetch those issues with relations (exclude solutions and rejected)
    const results = await db.query.issues.findMany({
      where: and(inArray(issues.id, issueIds), isNull(issues.parentId), ne(issues.status, 'rejected')),
      with: {
        issueTags: { with: { tag: true } },
        issueSdgs: { with: { sdg: true } },
      },
    })
    return results.map(transformIssue)
  }

  const results = await db.query.issues.findMany({
    where: and(isNull(issues.parentId), ne(issues.status, 'rejected')),
    with: {
      issueTags: { with: { tag: true } },
      issueSdgs: { with: { sdg: true } },
    },
  })
  return results.map(transformIssue)
})
