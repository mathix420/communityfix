import { eq } from 'drizzle-orm'
import { issues } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDB()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<{ response: string }>(event)

  if (!body.response?.trim()) {
    throw createError({ statusCode: 400, message: 'Response is required' })
  }

  const issue = await db.query.issues.findFirst({ where: eq(issues.id, id) })
  if (!issue) {
    throw createError({ statusCode: 404, message: 'Issue not found' })
  }
  if (issue.authorId !== session.user.id) {
    throw createError({ statusCode: 403, message: 'Only the author can respond' })
  }
  if (!issue.infoRequest) {
    throw createError({ statusCode: 400, message: 'No information was requested' })
  }
  if (issue.status !== 'pending') {
    throw createError({ statusCode: 400, message: 'Issue is no longer pending' })
  }

  await db.update(issues)
    .set({
      infoResponse: body.response.trim(),
      infoRespondedAt: new Date(),
    })
    .where(eq(issues.id, id))

  const reviewPromise = runTask('review:issue', { payload: { issueId: id } })
    .catch(err => console.error(`[respond-info] Background re-review failed for issue ${id}:`, err))

  ;(event.context as { cloudflare?: { context?: { waitUntil?: (p: Promise<unknown>) => void } } })
    .cloudflare?.context?.waitUntil?.(reviewPromise)

  return { success: true }
})
