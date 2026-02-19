# CommunityFix

## Development

- Always use `bun` as the package manager (not npm/yarn/pnpm)
- Run dev server: `bun run dev`
- Type check: `bunx vue-tsc --noEmit`

## Database

- Cloudflare D1 (SQLite) via Drizzle ORM + NuxtHub
- Schema: `server/database/schema.ts`
- Seed files: `server/database/seed/` (numbered SQL files, applied in order)
- Generate migrations: `bun run db:generate`
- Push schema (remote D1): `bun run db:push` (requires CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_API_TOKEN)
- Seed local: `for f in server/database/seed/*.sql; do wrangler d1 execute DB --local --file=$f; done`
- Seed remote: `for f in server/database/seed/*.sql; do wrangler d1 execute DB --remote --file=$f; done`
- Drizzle Studio: `bun run db:studio`

## Nitro Tasks

- Docs: https://nitro.build/guide/tasks
- Tasks live in `server/tasks/` (nested dirs become colon-separated names, e.g. `review/issue.ts` → `review:issue`)
- Enabled via `nitro.experimental.tasks` in `nuxt.config.ts`
- Scheduled tasks (cron) configured in `nitro.scheduledTasks`
- Run programmatically with `runTask('task:name', { payload: { ... } })`
- Dev endpoints: `/_nitro/tasks` (list) and `/_nitro/tasks/:name` (run)

## Auth

- Passwordless auth via `nuxt-auth-utils`: passkeys (WebAuthn) + OAuth (Google, Apple)
- Docs: https://raw.githubusercontent.com/atinux/nuxt-auth-utils/refs/heads/main/README.md
- Use `<AuthState>` component for rendering auth-dependent UI (handles SSR/CSR/prerendering correctly)
- Use `useUserSession()` composable only in script setup (not for template rendering in cached/prerendered pages)

## Analytics (Umami)

- Umami is loaded via `useScript` in `app/app.vue` and proxied through `/umami/**`
- Docs: https://umami.is/docs/track-events
- Add analytics events to meaningful user interactions — don't track everything, focus on actions that inform product decisions
- **When to add events**: form submissions, auth actions (login, register, logout), issue creation, solution submissions, upvotes/endorsements, external link clicks, navigation to key pages, CTA button clicks
- **When NOT to add events**: routine navigation, scrolling, hover states, every single click
- **Prefer data attributes** in templates for simple interactions:
  ```html
  <UButton data-umami-event="Create issue" data-umami-event-page="new">Submit</UButton>
  ```
- **Use JS tracking** (`umami.track()`) for programmatic events (e.g., after async operations succeed):
  ```ts
  umami.track('Issue created', { issueId: issue.id })
  ```
- Event names: max 50 characters, use sentence case (e.g., `"Sign up with Google"`, `"Submit solution"`)
- Include relevant context as event data properties (e.g., issue ID, auth provider, tag slug) but never send PII (emails, names)
