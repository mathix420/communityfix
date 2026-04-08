import { users } from '../../database/schema'

// Process users in chunks so the task fits inside the Workers cron CPU
// budget (30s) on non-trivial user counts. Failures on individual users
// must not abort the whole batch, otherwise a single corrupt row halts
// every subsequent recompute.
const CHUNK_SIZE = 25

export default defineTask({
  meta: {
    name: 'compute:trust-scores',
    description: 'Recompute trust scores for all users',
  },
  async run() {
    // Share one postgres client across every `useDB()` call in this task —
    // scheduled tasks run without an h3 event, so without this scope each
    // nested `useDB()` would open its own connection.
    return withScopedDB(async () => {
      const db = useDB()

      const allUsers = await db.select({ id: users.id }).from(users)
      let updated = 0
      const failures: Array<{ userId: string, error: string }> = []

      for (let i = 0; i < allUsers.length; i += CHUNK_SIZE) {
        const chunk = allUsers.slice(i, i + CHUNK_SIZE)
        const results = await Promise.allSettled(
          chunk.map(u => updateUserTrustScore(u.id)),
        )
        results.forEach((result, idx) => {
          const userId = chunk[idx]!.id
          if (result.status === 'fulfilled') {
            updated++
          }
          else {
            const message = result.reason instanceof Error ? result.reason.message : String(result.reason)
            console.error(`[compute:trust-scores] Failed for user ${userId}:`, result.reason)
            failures.push({ userId, error: message })
          }
        })
      }

      return {
        result: `Updated trust scores for ${updated}/${allUsers.length} users (${failures.length} failures)`,
        failures,
      }
    })
  },
})
