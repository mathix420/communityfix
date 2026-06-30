import { purgeExpired } from '../../utils/oauth'

export default defineTask({
  meta: {
    name: 'oauth:purge',
    description: 'Delete expired OAuth codes and dead token rows',
  },
  async run() {
    // Scheduled tasks run without an h3 event — scope one DB client across the
    // nested useDB() calls (matches compute:trust-scores).
    return withScopedDB(async () => {
      const { codes, tokens } = await purgeExpired()
      return { result: `Purged ${codes} codes, ${tokens} tokens` }
    })
  },
})
