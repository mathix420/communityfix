# CommunityFix

## Development

- Always use `bun` as the package manager (not npm/yarn/pnpm)
- Secrets are managed via **Doppler** — run `doppler setup --project communityfix --config dev` once, then all scripts automatically inject env vars via `doppler run --`
- Run dev server: `bun run dev`
- Type check: `bunx vue-tsc --noEmit`
- To run an ad-hoc command with the Doppler env: `doppler run -- <command>`
- To target a different config: `doppler run -c stg -- <command>` (or `prd`)

## Database

- PostgreSQL via Drizzle ORM (`drizzle-orm/postgres-js`) with PostGIS, pgvector, and tsvector full-text search
- **Local (dev + tests)**: Docker Postgres via `docker-compose.yml` — image built from `docker/Dockerfile.postgres` (postgis + pgvector). Start with `bun run docker:up`
- **Production**: Neon Postgres, reached from Cloudflare Workers through a Hyperdrive binding (`HYPERDRIVE` in `wrangler.jsonc`). `server/plugins/hyperdrive.ts` hydrates `NUXT_DATABASE_URL` from the binding at request/scheduled time so `useDB()` works unchanged
- Schema: `server/database/schema.ts`
- Custom migrations (extensions, generated columns, GIN/HNSW/GIST indexes): `server/database/migrations/custom/`
- Seed files: `server/database/seed/` (numbered SQL files, applied in order)
- Generate migrations: `bun run db:generate`
- Run migrations (drizzle + custom): `bun run db:migrate` — reads `NUXT_DATABASE_URL`. For Neon prod use the **direct** (non-pooled) connection string for DDL; runtime traffic goes through Hyperdrive on the pooled URL
- Seed: `bun run db:seed` (runs `psql $NUXT_DATABASE_URL` against each file in `server/database/seed/*.sql`)
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
- **NEVER use `data-umami-event` (or `data-umami-event-*`) attributes anywhere** — not on `UButton`, not on plain `<a>`/`<button>`, not on `<NuxtLink>`. They have caused too many issues in this project and are considered broken. Always use the `useUmami()` composable instead.
- **Always use the `useUmami()` composable** for every Umami event:
  ```ts
  const { track } = useUmami()
  track('Issue created', { issueId: issue.id })
  ```
  ```html
  <NuxtLink to="/page" @click="track('Nav click')">Link</NuxtLink>
  <UButton @click="track('Submit issue')">Submit</UButton>
  ```
- If the click already calls a handler function, put the `track(...)` call **inside** the handler rather than wiring it on the element.
- Event names: max 50 characters, use sentence case (e.g., `"Sign up with Google"`, `"Submit solution"`)
- Include relevant context as event data properties (e.g., issue ID, auth provider, tag slug) but never send PII (emails, names)
