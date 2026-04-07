import { users } from '../../database/schema'

export default defineTask({
  meta: {
    name: 'compute:trust-scores',
    description: 'Recompute trust scores for all users',
  },
  async run() {
    const db = useDB()

    const allUsers = await db.select({ id: users.id }).from(users)
    let updated = 0

    for (const user of allUsers) {
      await updateUserTrustScore(user.id)
      updated++
    }

    return { result: `Updated trust scores for ${updated} users` }
  },
})
