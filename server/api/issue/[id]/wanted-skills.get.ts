// Public list of skills an issue/solution is looking for. Small payload:
// the chip label, who added it (name + id so the client can show a delete
// affordance on own entries), and when.
import { asc, eq } from 'drizzle-orm'
import { issues, users, wantedSkills } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id || isNaN(parseInt(id, 10))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid issue ID' })
  }
  const issueId = parseInt(id, 10)

  const db = useDB()
  const node = await db.query.issues.findFirst({
    where: eq(issues.id, issueId),
    columns: { id: true },
  })
  if (!node) throw createError({ statusCode: 404, statusMessage: `Issue ${issueId} not found` })

  return db
    .select({
      id: wantedSkills.id,
      skill: wantedSkills.skill,
      createdBy: users.name,
      createdById: wantedSkills.createdBy,
      createdAt: wantedSkills.createdAt,
    })
    .from(wantedSkills)
    .leftJoin(users, eq(users.id, wantedSkills.createdBy))
    .where(eq(wantedSkills.issueId, issueId))
    .orderBy(asc(wantedSkills.createdAt), asc(wantedSkills.id))
})
