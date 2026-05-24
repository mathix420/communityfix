import { eq, or, desc } from 'drizzle-orm'
import { issues } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const query = getQuery(event)
  const filter = query.filter as string | undefined

  let where
  if (filter === 'appeals') {
    where = eq(issues.appealStatus, 'pending')
  }
  else if (filter === 'pending') {
    where = eq(issues.status, 'pending')
  }
  else {
    where = or(eq(issues.status, 'pending'), eq(issues.appealStatus, 'pending'))
  }

  const rows = await db.query.issues.findMany({
    where,
    with: {
      author: { columns: { id: true, name: true, email: true } },
    },
    orderBy: desc(issues.createdAt),
    limit: 100,
  })

  return rows
})
