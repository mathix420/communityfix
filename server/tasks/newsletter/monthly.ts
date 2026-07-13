import { runNewsletterSend } from '../../utils/newsletter-send'

export default defineTask({
  meta: {
    name: 'newsletter:monthly',
    description: 'Send the monthly newsletter digest to opted-in users',
  },
  async run() {
    // Scheduled tasks run without an h3 event — scope one postgres client
    // across every useDB() call in the run (see compute:trust-scores).
    return withScopedDB(async () => {
      const summary = await runNewsletterSend('monthly')
      return {
        result: `Monthly newsletter: ${summary.sent} sent, ${summary.empty} empty, ${summary.failures.length} failures (${summary.recipients} recipients)`,
        ...summary,
      }
    })
  },
})
