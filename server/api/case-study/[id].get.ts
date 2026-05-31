import { eq } from 'drizzle-orm'
import { caseStudies } from '../../database/schema'
import { transformCaseStudy } from '../../utils/case-study-write'
import { getDocumentUri } from '../../utils/standard-site'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id || isNaN(parseInt(id, 10))) return null

  const row = await useDB().query.caseStudies.findFirst({
    where: eq(caseStudies.id, parseInt(id, 10)),
    with: { author: { columns: { name: true } } },
  })
  if (!row) return null

  // standard.site document AT-URI, when published — drives the page's
  // <link rel="site.standard.document"> verification tag.
  const standardSiteUri = await getDocumentUri('case_study', row.id)
  return { ...transformCaseStudy(row), standardSiteUri }
})
