import { syncStandardSite } from '../../utils/standard-site'

export default defineTask({
  meta: {
    name: 'sync:standard-site',
    description: 'Publish standard.site (AT Protocol) publication + document records to the configured PDS',
  },
  async run() {
    // Scheduled tasks run without an h3 event, so wrap in withScopedDB to give
    // every nested useDB() one shared postgres client (mirrors compute:trust-scores).
    return withScopedDB(async () => {
      const report = await syncStandardSite()
      if (report.skipped) {
        return { result: 'standard.site sync skipped — atproto credentials not configured' }
      }
      return {
        result: `standard.site synced — publication ${report.publicationUri ? 'ok' : 'missing'}, `
          + `${report.documentsPublished} documents published, ${report.documentsUnchanged} unchanged, `
          + `${report.failures.length} failures`,
        ...report,
      }
    })
  },
})
