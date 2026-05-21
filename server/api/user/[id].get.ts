import { eq, and, isNull, ne, desc, inArray, count } from 'drizzle-orm'
import {
  users,
  issues,
  qualifications,
  qualificationEndorsements,
  caseStudies,
} from '../../database/schema'
import { transformCaseStudy } from '../../utils/case-study-write'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  // The literal strings "undefined" / "null" sneak through truthy checks when
  // a caller stringifies a missing reactive value (`/user/${user?.id}`), so
  // reject anything that isn't a real UUID before it reaches Postgres.
  if (!id || !UUID_RE.test(id)) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const db = useDB()

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: {
      id: true,
      email: true,
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

  // Bulk-fetch endorsement counts + verification flags + whether the viewer
  // has already endorsed. Counts are split by kind: peer endorsements are
  // tallied, verifications are surfaced as a per-qualification boolean.
  const qIds = rows.map(r => r.id)
  const counts = qIds.length
    ? await db
        .select({
          qualificationId: qualificationEndorsements.qualificationId,
          kind: qualificationEndorsements.kind,
          count: count(qualificationEndorsements.id).as('count'),
        })
        .from(qualificationEndorsements)
        .where(inArray(qualificationEndorsements.qualificationId, qIds))
        .groupBy(qualificationEndorsements.qualificationId, qualificationEndorsements.kind)
    : []
  const countMap = new Map<number, number>()
  const verifiedSet = new Set<number>()
  for (const c of counts) {
    if (c.kind === 'verification') {
      if (Number(c.count) > 0) verifiedSet.add(c.qualificationId)
    }
    else {
      countMap.set(c.qualificationId, (countMap.get(c.qualificationId) ?? 0) + Number(c.count))
    }
  }

  // Admins' own credentials are auto-verified — the team behind the platform
  // is trusted by definition; explicit verification rows would be redundant.
  const ownerIsAdmin = isAdminEmail(user.email)

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

  // Total peer endorsements received across all this user's qualifications.
  const totalEndorsementsReceived = Array.from(countMap.values()).reduce((sum, n) => sum + n, 0)

  // Viewer gating: can only endorse if the viewer themself has received at
  // least one endorsement on any of their own qualifications. Owners can
  // never endorse themselves regardless. Admins bypass the gating — kept in
  // sync with the same check in /api/qualifications/[id]/endorse (POST).
  const viewerIsAdmin = isAdminEmail(session.user?.email)
  let viewerCanEndorse = false
  if (viewerId && !isOwner) {
    if (viewerIsAdmin) {
      viewerCanEndorse = true
    }
    else {
      // Only peer endorsements count toward the trust gate — receiving an
      // admin verification doesn't unlock endorsing others.
      const [row] = await db
        .select({ n: count(qualificationEndorsements.id).as('n') })
        .from(qualificationEndorsements)
        .innerJoin(qualifications, eq(qualifications.id, qualificationEndorsements.qualificationId))
        .where(and(
          eq(qualifications.userId, viewerId),
          eq(qualificationEndorsements.kind, 'endorsement'),
        ))
      viewerCanEndorse = Number(row?.n ?? 0) > 0
    }
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

  // Case studies authored by this user. No status/moderation field yet — every
  // row is publicly visible; the verified flag is a separate signal.
  const userCaseStudies = await db.query.caseStudies.findMany({
    where: eq(caseStudies.authorId, user.id),
    with: { author: { columns: { name: true } } },
    orderBy: [desc(caseStudies.verified), desc(caseStudies.createdAt)],
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
      isVerified: verifiedSet.has(q.id) || ownerIsAdmin,
      viewerHasEndorsed: viewerEndorsedSet.has(q.id),
    })),
    isAdmin: ownerIsAdmin,
    endorsementsReceived: totalEndorsementsReceived,
    viewer: {
      isOwner,
      canEndorse: viewerCanEndorse,
      isAdmin: viewerIsAdmin,
      isAuthenticated: !!viewerId,
    },
    issues: filterSpam(userIssues).map(i => transformIssue(i, { includeModeration: isOwner })),
    solutions: filterSpam(userSolutions).map(i => transformIssue(i, { includeModeration: isOwner })),
    caseStudies: userCaseStudies.map(transformCaseStudy),
  }
})
