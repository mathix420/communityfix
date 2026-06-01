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

## Deployment

- Builds and deploys run from GitHub Actions (`.github/workflows/ci.yml`), not Cloudflare Workers Builds. Pushing to `master` runs migrations against Neon production then `wrangler deploy`s the `communityfix` Worker; pushing to `staging` does the same against Neon staging and deploys to `communityfix-staging` via `wrangler deploy --name communityfix-staging`.
- The branch-aware Hyperdrive / KV IDs in `nuxt.config.ts` are picked by the `WORKERS_CI_BRANCH` env var, which the workflow sets explicitly (`master` or `staging`) before each build.
- Required GitHub repo secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `DOPPLER_TOKEN`. Runtime Worker secrets (`NUXT_DATABASE_URL`, `NUXT_SESSION_PASSWORD`, `NUXT_OPENAI_API_KEY`, `NUXT_ANTHROPIC_API_KEY`, etc.) are managed in Doppler (`prd` / `stg` configs) and synced to the Workers on every deploy via `wrangler secret bulk` — Doppler is the source of truth, so add new secrets there, not via the Cloudflare dashboard.
- PRs run `typecheck`, `test`, and `build` (Worker bundle compiles cleanly). All three are required checks on `master` and `staging` per `.github/rulesets/`.

## Nitro Tasks

- Docs: https://nitro.build/guide/tasks
- Tasks live in `server/tasks/` (nested dirs become colon-separated names, e.g. `review/issue.ts` → `review:issue`)
- Enabled via `nitro.experimental.tasks` in `nuxt.config.ts`
- Scheduled tasks (cron) configured in `nitro.scheduledTasks`
- Run programmatically with `runTask('task:name', { payload: { ... } })`
- Dev endpoints: `/_nitro/tasks` (list) and `/_nitro/tasks/:name` (run)

## AI moderation

- AI moderation (OpenAI embeddings + Claude calls + DB writes, ~10–40s) runs as a **Cloudflare Workflow** for durability — Cloudflare cancels `waitUntil()` work 30s after the response, which used to leave issues/case-studies stuck `pending`.
- **All moderation logic lives in a standalone Worker** (`workers/moderation/`), which hosts the `ModerationWorkflow` and talks to Neon directly via its own `HYPERDRIVE` binding (reusing `server/database/schema.ts`). The Nuxt app does **not** contain the review logic — it only triggers reviews. The main Worker binds to the workflow cross-script via `nitro.cloudflare.wrangler.workflows` (binding `MODERATION_WORKFLOW`, branch-aware name `moderation` / `moderation-staging`).
- Flow: trigger sites call `triggerModeration(kind, id)` (`server/utils/moderation-trigger.ts`) → `env.MODERATION_WORKFLOW.create({ params: { kind, id } })`. The worker runs the pipeline as durable, independently-retried steps. Issue review = `prepare` → (`moderate` ∥ `classify-tags` ∥ `map-sdgs`) → `finalize` → structural pass when approved. `kind` is `'issue' | 'case-study' | 'structure'`.
- In dev there is no binding, so `triggerModeration` logs and skips; run `wrangler dev` in `workers/moderation/` to exercise moderation locally.
- The worker needs Doppler secrets `NUXT_OPENAI_API_KEY` / `NUXT_ANTHROPIC_API_KEY` / `NUXT_ADMIN_EMAILS` (synced by CI). CI deploys `workers/moderation/` **before** the main Worker on every `master`/`staging` push. Details: `workers/moderation/README.md`.

## MCP server

CommunityFix exposes an MCP (Model Context Protocol) server at `POST /api/mcp` so AI clients (Claude Desktop, IDE plugins, etc.) can search, browse, and create issues on a user's behalf.

- OAuth 2.1 + PKCE authorization served by this app — no external auth provider needed
- Discovery: `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server`
- Dynamic client registration: `POST /oauth/register` (RFC 7591, public clients only — PKCE required)
- Authorization endpoint: `GET /oauth/authorize` (renders an HTML consent screen for the logged-in user; bounces unauthenticated users through `/login` and resumes via the `mcp_continue` cookie)
- Token endpoint: `POST /oauth/token` (grants: `authorization_code`, `refresh_token`)
- Access tokens are opaque, valid 1h, sha256-hashed in `oauth_tokens`. Refresh tokens rotate on every use.
- Tools exposed: `search_issues_solutions` (vector search), `get_issue`, `get_tree`, `create_issue` / `create_solution`, `update_issue` / `update_solution` (split by node kind — solutions require `parentId`; updates error if `id` resolves to the other kind), `suggest_more`, `whoami`, `get_user`, `search_tags`. Issues and solutions have two text fields: `summary` (required, plaintext, ≤280 chars) and `description` (optional, markdown).
- Tool business logic lives in `server/utils/mcp-tools.ts`; the JSON-RPC plumbing in `server/api/mcp/index.post.ts`
- New tables: `oauth_clients`, `oauth_codes`, `oauth_tokens` (see migration `0007_cool_peter_quill.sql`)

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
