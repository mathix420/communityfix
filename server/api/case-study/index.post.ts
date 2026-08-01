import type { CaseStudyOutcome, LocationScale } from '../../database/schema'
import {
  caseStudyWithSolutions,
  createCaseStudy,
  transformCaseStudy,
} from '../../utils/case-study-write'
import { eq } from 'drizzle-orm'
import { caseStudies } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody<{
    title?: string
    solutionIds?: number[]
    outcome?: CaseStudyOutcome
    locationName?: string
    latitude?: number
    longitude?: number
    description?: string
    scale?: LocationScale
    implementer?: string
    startDate?: string
    endDate?: string
    metrics?: Array<{ label: string; baseline?: string; result?: string; unit?: string }>
    cost?: number | string
    currency?: string
    fundingSource?: string
    sources?: Array<{ url: string; title?: string }>
    lessonsLearned?: string[]
    links?: Array<{ url: string; title?: string }>
  }>(event)

  if (!body.title?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'title is required' })
  }
  if (!Array.isArray(body.solutionIds) || body.solutionIds.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'solutionIds is required' })
  }
  if (!body.outcome) throw createError({ statusCode: 400, statusMessage: 'outcome is required' })
  if (!body.locationName?.trim())
    throw createError({ statusCode: 400, statusMessage: 'locationName is required' })
  if (body.latitude == null || body.longitude == null) {
    throw createError({ statusCode: 400, statusMessage: 'latitude and longitude are required' })
  }

  const created = await createCaseStudy(session.user.id, {
    title: body.title,
    solutionIds: body.solutionIds,
    outcome: body.outcome,
    locationName: body.locationName,
    latitude: body.latitude,
    longitude: body.longitude,
    description: body.description,
    scale: body.scale,
    implementer: body.implementer,
    startDate: body.startDate,
    endDate: body.endDate,
    metrics: body.metrics,
    cost: body.cost,
    currency: body.currency,
    fundingSource: body.fundingSource,
    sources: body.sources,
    lessonsLearned: body.lessonsLearned,
    links: body.links,
  })

  const hydrated = await useDB().query.caseStudies.findFirst({
    where: eq(caseStudies.id, created.id),
    with: caseStudyWithSolutions,
  })
  return transformCaseStudy(hydrated!)
})
