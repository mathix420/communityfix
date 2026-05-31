// Admin-triggered standard.site publish. The scheduled sync:standard-site task
// only runs daily; this lets an operator push records on demand (e.g. right
// after configuring atproto credentials or approving notable content).
// Auth is enforced by server/middleware/admin.ts for the /api/admin/** prefix.
import { syncStandardSite } from '../../../utils/standard-site'

export default defineEventHandler(async () => {
  const report = await syncStandardSite()
  if (report.skipped) {
    throw createError({
      statusCode: 503,
      message: 'standard.site is not configured — set NUXT_ATPROTO_IDENTIFIER and NUXT_ATPROTO_PASSWORD',
    })
  }
  return report
})
