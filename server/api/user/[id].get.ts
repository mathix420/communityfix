import { eq, and, isNull, ne, desc, inArray, count } from 'drizzle-orm'
import {
  users,
  issues,
  qualifications,
  qualificationEndorsements,
} from '../../database/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing user ID' })
  }

  const db = useDB()

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: {
      id: true,
      name: true,
      headline: true,
      bio: true,
      location: true,
      trustScore: true,
      createdAt: true,
    },
  })

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const session = await getUserSession(event)
  const viewerId = session.user?.id ?? null
  const isOwner = viewerId === user.id

  // Qualifications for this profile, newest first.
  const rows = await db.query.qualifications.findMany({
    where: eq(qualifications.userId, user.id),
    orderBy: [desc(qualifications.createdAt)],
  })

  // Bulk-fetch endorsement counts + whether the viewer has already endorsed.
  const qIds = rows.map(r => r.id)
  const counts = qIds.length
    ? await db
        .select({
          qualificationId: qualificationEndorsements.qualificationId,
          count: count(qualificationEndorsements.id).as('count'),
        })
        .from(qualificationEndorsements)
        .where(inArray(qualificationEndorsements.qualificationId, qIds))
        .groupBy(qualificationEndorsements.qualificationId)
    : []
  const countMap = new Map(counts.map(c => [c.qualificationId, Number(c.count)]))

  const viewerEndorsements = viewerId && qIds.length
    ? await db
        .select({ qualificationId: qualificationEndorsements.qualificationId })
        .from(qualificationEndorsements)
        .where(and(
          inArray(qualificationEndorsements.qualificationId, qIds),
          eq(qualificationEndorsements.endorserId, viewerId),
        ))
    : []
  const viewerEndorsedSet = new Set(viewerEndorsements.map(r => r.qualificationId))

  // Total endorsements received across all this user's qualifications.
  const totalEndorsementsReceived = counts.reduce((sum, c) => sum + Number(c.count), 0)

  // Viewer gating: can only endorse if the viewer themself has received at
  // least one endorsement on any of their own qualifications. Owners can
  // never endorse themselves regardless.
  let viewerCanEndorse = false
  if (viewerId && !isOwner) {
    const [row] = await db
      .select({ n: count(qualificationEndorsements.id).as('n') })
      .from(qualificationEndorsements)
      .innerJoin(qualifications, eq(qualifications.id, qualificationEndorsements.qualificationId))
      .where(eq(qualifications.userId, viewerId))
    viewerCanEndorse = Number(row?.n ?? 0) > 0
  }

  const userIssues = await db.query.issues.findMany({
    where: isOwner
      ? and(eq(issues.authorId, user.id), isNull(issues.parentId))
      : and(eq(issues.authorId, user.id), isNull(issues.parentId), ne(issues.status, 'rejected')),
    with: issueWithRelations,
  })

  const userSolutions = await db.query.issues.findMany({
    where: isOwner
      ? and(eq(issues.authorId, user.id), eq(issues.type, 'solution'))
      : and(eq(issues.authorId, user.id), eq(issues.type, 'solution'), ne(issues.status, 'rejected')),
    with: issueWithRelations,
  })

  const filterSpam = (items: typeof userIssues) =>
    isOwner ? items.filter(i => !i.isSpam) : items

  return {
    id: user.id,
    name: user.name,
    headline: user.headline,
    bio: user.bio,
    location: user.location,
    trustScore: user.trustScore,
    createdAt: user.createdAt,
    qualifications: rows.map(q => ({
      id: q.id,
      title: q.title,
      area: q.area,
      detail: q.detail,
      createdAt: q.createdAt,
      endorsementCount: countMap.get(q.id) ?? 0,
      viewerHasEndorsed: viewerEndorsedSet.has(q.id),
    })),
    endorsementsReceived: totalEndorsementsReceived,
    viewer: {
      isOwner,
      canEndorse: viewerCanEndorse,
      isAuthenticated: !!viewerId,
    },
    issues: filterSpam(userIssues).map(i => transformIssue(i, { includeModeration: isOwner })),
    solutions: filterSpam(userSolutions).map(i => transformIssue(i, { includeModeration: isOwner })),
  }
})
