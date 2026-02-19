import { eq } from 'drizzle-orm'
import { issues } from '../../database/schema'
import { reviewIssue } from '../../utils/review-issue'

export default defineTask({
  meta: {
    name: 'review:pending',
    description: 'Review all issues still in pending status (cron fallback)',
  },
  async run() {
    const db = useDB()
    const pending = await db.query.issues.findMany({
      where: eq(issues.status, 'pending'),
      columns: { id: true },
    })

    for (const issue of pending) {
      await reviewIssue(issue.id)
    }

    return { result: `Reviewed ${pending.length} pending issues` }
  },
})
