// Remove a wanted skill from an issue/solution. Allowed for whoever added it,
// the node's author (creator provenance) or a node owner (the membership-based
// replacement for authorId — see node_members), or an admin.
import { and, eq } from 'drizzle-orm'
import { issues, wantedSkills } from '../../../../database/schema'
import { isNodeOwner } from '../../../../utils/node-members'
import { isSessionAdmin } from '../../../../utils/is-admin'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  const issueId = requireIdParam(event)
  const skillId = requireIdParam(event, { name: 'skillId', label: 'skill' })

  const db = useDB()
  const row = await db.query.wantedSkills.findFirst({
    where: and(eq(wantedSkills.id, skillId), eq(wantedSkills.issueId, issueId)),
    columns: { id: true, createdBy: true },
  })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Wanted skill not found' })

  const node = await db.query.issues.findFirst({
    where: eq(issues.id, issueId),
    columns: { authorId: true },
  })

  const userId = session.user.id
  const allowed =
    row.createdBy === userId ||
    node?.authorId === userId ||
    (await isNodeOwner(userId, 'issue', issueId)) ||
    (await isSessionAdmin(event))
  if (!allowed) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only the skill creator, the node author, or an admin can remove this',
    })
  }

  await db.delete(wantedSkills).where(eq(wantedSkills.id, skillId))
  return { ok: true }
})
