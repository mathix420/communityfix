// Public list of skills an issue/solution is looking for. Small payload:
// the chip label, who added it (name + id so the client can show a delete
// affordance on own entries), and when.
import { asc, eq } from 'drizzle-orm'
import { users, wantedSkills } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const issueId = requireIdParam(event)
  await assertIssueExists(issueId)

  return useDB()
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
