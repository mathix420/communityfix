import { and, desc, eq, inArray } from 'drizzle-orm'
import { caseStudies, issues } from '../../../database/schema'
import {
  caseStudyWithSolutions,
  findCaseStudyIdsForSolutions,
  transformCaseStudy,
} from '../../../utils/case-study-write'

// List case studies under an issue or solution.
//   - solution id → its own case studies
//   - issue id    → aggregated across all approved solution children
export default defineEventHandler(async (event) => {
  const db = useDB()
  const issueId = requireIdParam(event)

  const root = await db.query.issues.findFirst({
    where: eq(issues.id, issueId),
    columns: { id: true, type: true },
  })
  if (!root) return []

  let solutionIds: number[]
  if (root.type === 'solution') {
    solutionIds = [root.id]
  } else {
    const solutionRows = await db.query.issues.findMany({
      where: and(
        eq(issues.parentId, root.id),
        eq(issues.type, 'solution'),
        eq(issues.status, 'approved'),
      ),
      columns: { id: true },
    })
    solutionIds = solutionRows.map((r) => r.id)
  }

  if (solutionIds.length === 0) return []

  const caseStudyIds = await findCaseStudyIdsForSolutions(solutionIds)
  if (caseStudyIds.length === 0) return []

  const rows = await db.query.caseStudies.findMany({
    where: and(inArray(caseStudies.id, caseStudyIds), eq(caseStudies.status, 'approved')),
    with: caseStudyWithSolutions,
    orderBy: [desc(caseStudies.verified), desc(caseStudies.createdAt)],
  })

  return withMembers('case_study', rows.map(transformCaseStudy))
})
