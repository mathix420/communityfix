import { and, eq, isNotNull, ne, sql } from 'drizzle-orm'
import { caseStudies, issues } from '../database/schema'

// Every approved, geolocated node and case study as a lightweight point for
// the /map explore page. Titles and coordinates only — the popup links to the
// detail page for everything else.
export default defineEventHandler(async () => {
  const db = useDB()

  const nodes = await db
    .select({
      id: issues.id,
      kind: issues.type,
      title: issues.title,
      locationName: issues.locationName,
      lat: sql<number>`ST_Y(${issues.location})`,
      lng: sql<number>`ST_X(${issues.location})`,
    })
    .from(issues)
    .where(and(eq(issues.status, 'approved'), ne(issues.isSpam, true), isNotNull(issues.location)))

  const studies = await db
    .select({
      id: caseStudies.id,
      locationName: caseStudies.locationName,
      outcome: caseStudies.outcome,
      lat: sql<number>`ST_Y(${caseStudies.location})`,
      lng: sql<number>`ST_X(${caseStudies.location})`,
    })
    .from(caseStudies)
    .where(
      and(
        eq(caseStudies.status, 'approved'),
        ne(caseStudies.isSpam, true),
        isNotNull(caseStudies.location),
      ),
    )

  return [
    ...nodes.map((n) => ({
      kind: n.kind as 'issue' | 'solution',
      id: n.id,
      title: n.title,
      locationName: n.locationName,
      outcome: null as string | null,
      lat: n.lat,
      lng: n.lng,
    })),
    ...studies.map((s) => ({
      kind: 'case-study' as const,
      id: s.id,
      title: s.locationName,
      locationName: s.locationName,
      outcome: s.outcome as string | null,
      lat: s.lat,
      lng: s.lng,
    })),
  ]
})
