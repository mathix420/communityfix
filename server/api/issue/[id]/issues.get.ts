import { eq, and } from 'drizzle-orm'
import { issues } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const id = getRouterParam(event, 'id')
  if (!id || isNaN(parseInt(id, 10))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid issue ID' })
  }

  const results = await db.query.issues.findMany({
    where: and(
      eq(issues.parentId, parseInt(id, 10)),
      eq(issues.status, 'approved'),
      eq(issues.type, 'issue'),
    ),
    with: issueWithRelations,
  })

  return results.map(i => transformIssue(i))
})
