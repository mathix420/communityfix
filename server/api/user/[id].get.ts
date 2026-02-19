import { eq, and, isNull, ne } from 'drizzle-orm'
import { users, issues } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing user ID' })
  }

  const db = useDB()

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: {
      id: true,
      name: true,
      createdAt: true,
    },
  })

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const session = await getUserSession(event)
  const isOwner = session.user?.id === user.id

  const userIssues = await db.query.issues.findMany({
    where: isOwner
      ? and(eq(issues.authorId, user.id), isNull(issues.parentId))
      : and(eq(issues.authorId, user.id), isNull(issues.parentId), ne(issues.status, 'rejected')),
    with: issueWithRelations,
  })

  const userSolutions = await db.query.issues.findMany({
    where: isOwner
      ? and(eq(issues.authorId, user.id), eq(issues.type, 'solution'))
      : and(eq(issues.authorId, user.id), eq(issues.type, 'solution'), ne(issues.status, 'rejected')),
    with: issueWithRelations,
  })

  // Spam issues are hidden even from the owner.
  // Non-owner queries already exclude rejected items (which includes spam) via the WHERE clause above.
  const filterSpam = (items: typeof userIssues) =>
    isOwner ? items.filter(i => !i.isSpam) : items

  return {
    id: user.id,
    name: user.name,
    createdAt: user.createdAt,
    issues: filterSpam(userIssues).map(i => transformIssue(i, { includeModeration: isOwner })),
    solutions: filterSpam(userSolutions).map(i => transformIssue(i, { includeModeration: isOwner })),
  }
})
