import type { LocationScale } from '../../database/schema'
import { createIssue } from '../../utils/issue-write'
import { triggerModeration } from '../../utils/moderation-trigger'

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
    links?: Array<{ url: string; title?: string }>
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

  await triggerModeration('issue', created.id)

  return created
})
