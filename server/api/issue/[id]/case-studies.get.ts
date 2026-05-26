import { and, desc, eq, inArray } from 'drizzle-orm'
import { caseStudies, issues } from '../../../database/schema'
import { transformCaseStudy } from '../../../utils/case-study-write'

// List case studies under an issue or solution.
//   - solution id → its own case studies
//   - issue id    → aggregated across all approved solution children
export default defineEventHandler(async (event) => {
  const db = useDB()
  const id = getRouterParam(event, 'id')
  if (!id || isNaN(parseInt(id, 10))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid issue ID' })
  }

  const root = await db.query.issues.findFirst({
    where: eq(issues.id, parseInt(id, 10)),
    columns: { id: true, type: true },
  })
  if (!root) return []

  let solutionIds: number[]
  if (root.type === 'solution') {
    solutionIds = [root.id]
  }
  else {
    const solutionRows = await db.query.issues.findMany({
      where: and(eq(issues.parentId, root.id), eq(issues.type, 'solution'), eq(issues.status, 'approved')),
      columns: { id: true },
    })
    solutionIds = solutionRows.map(r => r.id)
  }

  if (solutionIds.length === 0) return []

  const rows = await db.query.caseStudies.findMany({
    where: and(inArray(caseStudies.solutionId, solutionIds), eq(caseStudies.status, 'approved')),
    with: { author: { columns: { name: true } } },
    orderBy: [desc(caseStudies.verified), desc(caseStudies.createdAt)],
  })

  return rows.map(transformCaseStudy)
})
