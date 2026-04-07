// Hydrates NUXT_DATABASE_URL from the Cloudflare Hyperdrive binding so that
// `useDB()` (which reads `useRuntimeConfig().databaseUrl`) transparently uses
// the pooled Neon connection when running on Cloudflare Workers.
//
// Locally and in CI, `event.context.cloudflare` is undefined and this is a
// no-op — the URL comes from the NUXT_DATABASE_URL env var instead.

function hydrateFromBinding(env: Record<string, any> | undefined) {
  const connectionString = env?.HYPERDRIVE?.connectionString
  if (connectionString) {
    process.env.NUXT_DATABASE_URL = connectionString
  }
}

export default defineNitroPlugin((nitroApp) => {
  // Regular API requests
  nitroApp.hooks.hook('request', (event) => {
    hydrateFromBinding((event.context as any).cloudflare?.env)
  })

  // Scheduled tasks (cron triggers) — the cloudflare preset fires this
  // before invoking `runCronTasks`, giving us access to the env bindings.
  nitroApp.hooks.hook('cloudflare:scheduled' as any, ({ env }: { env: Record<string, any> }) => {
    hydrateFromBinding(env)
  })
})
