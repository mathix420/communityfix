import { eq } from 'drizzle-orm'
import { caseStudies } from '../../database/schema'
import { transformCaseStudy } from '../../utils/case-study-write'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id || isNaN(parseInt(id, 10))) return null

  const row = await useDB().query.caseStudies.findFirst({
    where: eq(caseStudies.id, parseInt(id, 10)),
    with: {
      author: { columns: { name: true } },
      solution: { columns: { title: true, summary: true } },
    },
  })
  return row ? transformCaseStudy(row) : null
})
