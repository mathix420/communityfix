// Add a wanted skill to an issue/solution. Any logged-in (non-banned) user can
// flag what a node needs; duplicates are rejected case-insensitively via the
// unique index on (issue_id, lower(skill)) — see custom migration 0007.
import { eq, sql } from 'drizzle-orm'
import { issues, wantedSkills } from '../../../database/schema'

const MIN_SKILL = 2
const MAX_SKILL = 60
const MAX_PER_NODE = 10

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  await assertNotBanned(session.user.id)

  const issueId = requireIdParam(event)

  const body = await readBody<{ skill?: string }>(event)
  const skill = body?.skill?.trim()
  if (!skill || skill.length < MIN_SKILL) {
    throw createError({
      statusCode: 400,
      statusMessage: `Skill must be at least ${MIN_SKILL} characters`,
    })
  }
  if (skill.length > MAX_SKILL) {
    throw createError({ statusCode: 400, statusMessage: `Skill too long (max ${MAX_SKILL})` })
  }

  const db = useDB()
  const node = await db.query.issues.findFirst({
    where: eq(issues.id, issueId),
    columns: { id: true, status: true },
  })
  if (!node || node.status === 'rejected') {
    throw createError({ statusCode: 404, statusMessage: 'Issue not found' })
  }

  const existing = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(wantedSkills)
    .where(eq(wantedSkills.issueId, issueId))
  if (Number(existing[0]?.n ?? 0) >= MAX_PER_NODE) {
    throw createError({
      statusCode: 400,
      statusMessage: `A node can list at most ${MAX_PER_NODE} wanted skills`,
    })
  }

  // The unique index handles duplicate detection (including concurrent adds):
  // insert and treat a unique violation as "already listed".
  try {
    const [row] = await db
      .insert(wantedSkills)
      .values({ issueId, skill, createdBy: session.user.id })
      .returning()
    return {
      id: row!.id,
      skill: row!.skill,
      createdBy: session.user.name ?? null,
      createdById: row!.createdBy,
      createdAt: row!.createdAt,
    }
  } catch (err: any) {
    // Drizzle wraps the driver error, so the unique-violation code can be on
    // the error itself or on its cause.
    if (err?.code === '23505' || err?.cause?.code === '23505') {
      throw createError({ statusCode: 400, statusMessage: 'This skill is already listed' })
    }
    throw err
  }
})
