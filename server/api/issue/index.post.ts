import type { LocationScale } from '../../database/schema'
import { createIssue } from '../../utils/issue-write'
import { cfWaitUntil } from '../../utils/wait-until'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody<{
    title?: string
    summary?: string
    description?: string
    parentId?: number
    type?: 'issue' | 'solution'
    locationName?: string
    latitude?: number
    longitude?: number
    scale?: LocationScale
    links?: Array<{ url: string, title?: string }>
  }>(event)

  const created = await createIssue(session.user.id, {
    title: body.title ?? '',
    summary: body.summary ?? '',
    description: body.description,
    parentId: body.parentId,
    type: body.type,
    locationName: body.locationName,
    latitude: body.latitude,
    longitude: body.longitude,
    scale: body.scale,
    links: body.links,
  })

  const reviewPromise = runTask('review:issue', { payload: { issueId: created.id } })
    .catch(err => console.error(`[review:issue] Background review failed for issue ${created.id}:`, err))
  cfWaitUntil(reviewPromise)

  return created
})
