import { eq } from 'drizzle-orm'
import { caseStudies } from '../../database/schema'
import { transformCaseStudy, updateCaseStudy } from '../../utils/case-study-write'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const id = getRouterParam(event, 'id')
  if (!id || isNaN(parseInt(id, 10))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid case study ID' })
  }

  const body = await readBody<Record<string, unknown>>(event)
  await updateCaseStudy(session.user.id, { id: parseInt(id, 10), ...body })

  const hydrated = await useDB().query.caseStudies.findFirst({
    where: eq(caseStudies.id, parseInt(id, 10)),
    with: { author: { columns: { name: true } } },
  })
  return transformCaseStudy(hydrated!)
})
