import { qualifications } from '../../database/schema'

const MAX_TITLE = 120
const MAX_AREA = 60
const MAX_DETAIL = 1000

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  await assertNotBanned(session.user.id)

  const body = await readBody<{
    title?: string
    area?: string
    detail?: string | null
  }>(event)

  const title = body.title?.trim()
  const area = body.area?.trim()
  const detail = body.detail?.trim() || null

  if (!title) throw createError({ statusCode: 400, statusMessage: 'Title is required' })
  if (!area) throw createError({ statusCode: 400, statusMessage: 'Area is required' })
  if (title.length > MAX_TITLE) throw createError({ statusCode: 400, statusMessage: `Title too long (max ${MAX_TITLE})` })
  if (area.length > MAX_AREA) throw createError({ statusCode: 400, statusMessage: `Area too long (max ${MAX_AREA})` })
  if (detail && detail.length > MAX_DETAIL) throw createError({ statusCode: 400, statusMessage: `Detail too long (max ${MAX_DETAIL})` })

  const db = useDB()
  const [row] = await db.insert(qualifications).values({
    userId: session.user.id,
    title,
    area,
    detail,
  }).returning()

  return {
    id: row!.id,
    title: row!.title,
    area: row!.area,
    detail: row!.detail,
    createdAt: row!.createdAt,
    endorsementCount: 0,
    viewerHasEndorsed: false,
  }
})
