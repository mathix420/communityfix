import { eq, sql } from 'drizzle-orm'
import { issues, users } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const user = session.user
  await assertNotBanned(user.id)
  const db = useDB()

  const body = await readBody<{
    title?: string
    description?: string
    detailedDescription?: string
    parentId?: number
    type?: 'issue' | 'solution'
  }>(event)

  if (!body.title?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Title is required' })
  }
  if (!body.description?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Description is required' })
  }

  // If this has a parent (sub-issue or solution), verify the parent exists
  if (body.parentId) {
    const parent = await db.query.issues.findFirst({
      where: eq(issues.id, body.parentId),
      columns: { id: true },
    })
    if (!parent) {
      throw createError({ statusCode: 404, statusMessage: 'Parent issue not found' })
    }
  }

  // Get author name from user record
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { name: true, email: true },
  })

  const type = body.parentId ? (body.type ?? 'issue') : 'issue'

  const rows = await db.insert(issues).values({
    title: body.title.trim(),
    description: body.description.trim(),
    detailedDescription: body.detailedDescription?.trim() || null,
    parentId: body.parentId ?? null,
    authorId: user.id,
    authorName: dbUser?.name ?? dbUser?.email ?? 'Anonymous',
    type,
  }).returning()
  const created = rows[0]!

  // Increment the correct counter on the parent issue
  if (body.parentId) {
    const counter = type === 'solution'
      ? { solutionCount: sql`${issues.solutionCount} + 1` }
      : { subIssueCount: sql`${issues.subIssueCount} + 1` }
    await db.update(issues)
      .set(counter)
      .where(eq(issues.id, body.parentId))
  }

  // Trigger AI review as a Nitro task (decoupled from request lifecycle).
  // waitUntil() prevents Cloudflare Workers from terminating the task after the response is sent.
  const promise = runTask('review:issue', { payload: { issueId: created.id } })
    .catch(err => console.error(`[review:issue] Background review failed for issue ${created.id}:`, err))
  event.context.cloudflare?.context?.waitUntil(promise)

  return created
})
