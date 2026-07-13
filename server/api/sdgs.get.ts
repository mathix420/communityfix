import { and, eq, ne, sql } from 'drizzle-orm'
import { issues, issueSdgs, sdgs } from '../database/schema'

export default defineEventHandler(async () => {
  const db = useDB()
  // `uses` counts approved, non-spam nodes mapped to each goal so browse UIs
  // can hide or rank empty goals.
  return db
    .select({
      id: sdgs.id,
      name: sdgs.name,
      iconUrl: sdgs.iconUrl,
      link: sdgs.link,
      createdAt: sdgs.createdAt,
      updatedAt: sdgs.updatedAt,
      uses: sql<number>`count(${issues.id})::int`,
    })
    .from(sdgs)
    .leftJoin(issueSdgs, eq(issueSdgs.sdgId, sdgs.id))
    .leftJoin(
      issues,
      and(eq(issues.id, issueSdgs.issueId), eq(issues.status, 'approved'), ne(issues.isSpam, true)),
    )
    .groupBy(sdgs.id)
    .orderBy(sdgs.id)
})
