// The signed-in user's declared interests, newest first. Labels are free text
// by design (not tag foreign keys) — matching happens via embeddings later.
import { desc, eq } from 'drizzle-orm'
import { userInterests } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDB()

  const rows = await db.query.userInterests.findMany({
    where: eq(userInterests.userId, session.user.id),
    columns: { id: true, label: true, createdAt: true },
    orderBy: [desc(userInterests.createdAt)],
  })

  return rows.map((r) => ({ id: r.id, label: r.label, createdAt: r.createdAt }))
})
