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
- Flow: trigger sites call `triggerModeration(kind, id)` (`server/utils/moderation-trigger.ts`) → `env.MODERATION_WORKFLOW.create({ params: { kind, id } })`. The worker runs the pipeline as durable, independently-retried steps. Issue review = `prepare` → (`moderate` ∥ `classify-tags` ∥ `map-sdgs`) → `finalize` → on approval an **enrich** pass (`curate` ∥ `resolve-location`) → structural pass. `kind` is `'issue' | 'case-study' | 'structure'`.
- **Prompts are data, not code.** Each AI step's `system`/`user` templates, output JSON Schema, `model`, `maxTokens`, and `version` live in a YAML file under `workers/moderation/src/steps/<kind>/*.yaml`, loaded + Zod-validated once at init by `src/steps.ts` (bundled as text via a Wrangler `Text` rule). Single-shot steps run via `runStep(...)`; **agentic** steps declare `tools: [...]` and run via `runAgent(...)` (model calls tools across turns, then `submit_result`). The imperative `prepare*`/`finalize*`/`apply*` steps in `src/pipelines.ts` build the `vars` and own all DB writes. To tune a prompt, edit the YAML + bump `version`, then `bunx vitest run tests/unit` (snapshots in `tests/unit/moderation-steps.test.ts` guard against silent prompt drift).
- **Curate + location enrichment** runs on approved nodes of every kind. `curate` tightens text (`issue.curate` rewrites issue/solution summary+description; `case-study.curate` strips to replication-relevant fields). `resolve-location` (`location.resolve`) is agentic: the model drives a `geocode` tool (Nominatim) to pick the candidate best matching the node's text, then `apply-location` persists the centroid `location` point **and** a GeoJSON **`area`** (jsonb column on `issues`/`case_studies`). Both are best-effort and never block approval; they write `curate` / `relocate` audit entries.
- In dev there is no binding, so `triggerModeration` logs and skips; run `wrangler dev` in `workers/moderation/` to exercise moderation locally.
- The worker needs Doppler secrets `NUXT_OPENAI_API_KEY` / `NUXT_ANTHROPIC_API_KEY` / `NUXT_ADMIN_EMAILS` (synced by CI). CI deploys `workers/moderation/` **before** the main Worker on every `master`/`staging` push. Details: `workers/moderation/README.md`.

## MCP server

CommunityFix exposes an MCP (Model Context Protocol) server at `POST /api/mcp` so AI clients (Claude Desktop, IDE plugins, etc.) can search, browse, and create issues on a user's behalf.

- OAuth 2.1 + PKCE authorization served by this app — no external auth provider needed
- Discovery: `/.well-known/oauth-protected-resource`, `/.well-known/oauth-authorization-server`, and the MCP server card `/.well-known/mcp/server-card.json`
- Dynamic client registration: `POST /oauth/register` (RFC 7591, public clients only — PKCE required)
- Authorization endpoint: `GET /oauth/authorize` (renders an HTML consent screen for the logged-in user; bounces unauthenticated users through `/login` and resumes via the `mcp_continue` cookie). The consent form carries an HMAC-signed CSRF token (`issueConsentToken`/`verifyConsentToken`, keyed on the session password) bound to `(user, client, redirect)`, verified on the POST.
- Token endpoint: `POST /oauth/token` (grants: `authorization_code`, `refresh_token`). Revocation endpoint: `POST /oauth/revoke` (RFC 7009).
- **Audience-bound tokens (RFC 8707):** `/oauth/authorize` accepts a `resource` param (defaulting to `<origin>/api/mcp`), carried onto the code then the token. `authenticateBearer` rejects a token whose bound `resource` doesn't match this MCP endpoint (legacy null-resource tokens still accepted).
- Access tokens are opaque, valid 1h, sha256-hashed in `oauth_tokens`. Refresh tokens rotate on every use; presenting an already-rotated refresh token triggers **reuse detection** — the whole token family for that client+user is revoked.
- **Rate limiting:** DB-backed fixed-window limiter (`server/utils/rate-limit.ts`, `rate_limits` table). Per-IP on `/oauth/register` (10/h), `/oauth/token` + `/oauth/revoke` (60/5min); per-user on `/api/mcp` (300/min global, 40/10min writes, 60/min embedding-search tools).
- **Cleanup:** `purgeExpired()` reaps expired codes, dead token rows (kept until the refresh window closes so reuse detection works), and stale rate-limit rows. Run by the `oauth:purge` scheduled task (`nitro.scheduledTasks`, 3:15am UTC).
- Tools exposed: `search_issues_solutions` (vector search), `get_issue`, `get_tree`, `create_issue` / `create_solution`, `update_issue` / `update_solution` (split by node kind — solutions require `parentId`; updates error if `id` resolves to the other kind), `create_case_study` / `update_case_study` / `get_case_study` / `list_case_studies`, `suggest_more`, `whoami`, `get_user`, `search_tags`, `get_whitepaper` (serves a bundled copy of `content/whitepaper.md` via `server/utils/whitepaper.ts`; kept in sync by `tests/unit/whitepaper-sync.test.ts`), and `get_guide` (authoring guides — no `slug` lists them, a `slug` returns the markdown; sourced from the `guides` Nuxt Content collection `content/guide/*.md` via `server/utils/mcp-guides.ts`, which `queryCollection`s server-side and reads the collection's `rawbody` field, enabled by a `schema` in `content.config.ts`). Issues and solutions have two text fields: `summary` (required, plaintext, ≤280 chars — a real standalone synopsis, **not** a truncated prefix of the description) and `description` (optional, markdown).
- **Dedup gate:** every `create_*` tool embeds the candidate text and blocks near-duplicates (issues/solutions vs approved nodes of the same type ≥0.5 cosine; case studies vs the same solution's studies ≥0.6), returning `{ status: 'similar_found', similar: [...] }` instead of creating. The caller must review and re-call with `confirmNew: true` to override. Server instructions also tell clients to search before creating.
- Tools advertise MCP `annotations` (readOnly/destructive/idempotent hints) + `title`, declare permissive `outputSchema`, and return `structuredContent` (object-shaped results only). Input is Zod-validated against the published schema (`server/utils/mcp-schemas.ts`) before any tool runs. Writes log a `[mcp.audit]` line with the acting `clientId`.
- Tool business logic lives in `server/utils/mcp-tools.ts`; the JSON-RPC plumbing in `server/api/mcp/index.post.ts`
- Tables: `oauth_clients`, `oauth_codes`, `oauth_tokens` (migration `0007_cool_peter_quill.sql`); `resource` columns + `rate_limits` table (migration `0016_free_may_parker.sql`)

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
