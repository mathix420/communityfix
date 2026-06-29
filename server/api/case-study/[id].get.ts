import { eq } from 'drizzle-orm'
import { caseStudies } from '../../database/schema'
import { transformCaseStudy } from '../../utils/case-study-write'
import { isNodeOwner } from '../../utils/node-members'

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
  if (!row) return null

  const session = await getUserSession(event)
  const viewerIsOwner = session.user?.id ? await isNodeOwner(session.user.id, 'case_study', row.id) : false
  return { ...transformCaseStudy(row), viewerIsOwner }
})
