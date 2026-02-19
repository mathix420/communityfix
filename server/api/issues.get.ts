import { eq, isNull, and, inArray, ne } from 'drizzle-orm'
import { issues, tags as tagsTable, issueTags } from '../database/schema'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const query = getQuery(event)
  const tagFilter = query.tag as string | undefined

  const baseConditions = [isNull(issues.parentId), ne(issues.status, 'rejected')]

  if (tagFilter) {
    const tag = await db.query.tags.findFirst({
      where: eq(tagsTable.slug, tagFilter),
    })
    if (!tag) return []

    const junctionRows = await db.query.issueTags.findMany({
      where: eq(issueTags.tagId, tag.id),
      columns: { issueId: true },
    })
    const issueIds = junctionRows.map(r => r.issueId)
    if (issueIds.length === 0) return []

    baseConditions.push(inArray(issues.id, issueIds))
  }

  const results = await db.query.issues.findMany({
    where: and(...baseConditions),
    with: issueWithRelations,
  })
  return results.map(i => transformIssue(i))
})
