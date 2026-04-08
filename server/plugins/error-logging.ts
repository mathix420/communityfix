// Logs unhandled request errors with their full `.cause` chain. Nitro's
// default handler still runs and renders the response — this plugin only
// augments logging, so the underlying Postgres error text actually lands
// in Workers logs instead of being hidden behind Drizzle's wrapper message.

import { formatError } from '../utils/format-error'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, context) => {
    const event = context.event
    console.error('[nitro:error]', {
      path: event?.path,
      method: event?.method,
      error: formatError(error),
    })
  })
})
