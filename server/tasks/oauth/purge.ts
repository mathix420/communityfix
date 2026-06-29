import { purgeExpired } from '../../utils/oauth'

export default defineTask({
  meta: {
    name: 'oauth:purge',
    description: 'Delete expired OAuth codes/tokens and stale rate-limit windows',
  },
  async run() {
    // Scheduled tasks run without an h3 event — scope one DB client across the
    // nested useDB() calls (matches compute:trust-scores).
    return withScopedDB(async () => {
      const { codes, tokens, rateLimits } = await purgeExpired()
      return { result: `Purged ${codes} codes, ${tokens} tokens, ${rateLimits} rate-limit rows` }
    })
  },
})
