# communityfix-moderation

Standalone Cloudflare Worker that **hosts and runs** the AI moderation pipeline as a
[Cloudflare Workflow](https://developers.cloudflare.com/workflows/). The full
moderation logic lives here (not in the Nuxt app) so it runs with durable execution —
automatic per-step retries and no 30s `waitUntil` cap, which is what used to leave
long AI reviews cancelled and nodes stuck `pending`.

## How it works

The main `communityfix` Worker only **triggers** a review — `triggerModeration(kind, id)`
in the app calls `env.MODERATION_WORKFLOW.create(...)` (cross-script binding configured
in `nitro.cloudflare.wrangler.workflows`). Everything else happens here. The worker
talks to Neon directly via its own `HYPERDRIVE` binding and reuses the app's Drizzle
schema (`server/database/schema.ts`) as the single source of truth for table shapes.

Workflow params: `{ kind: 'issue' | 'case-study' | 'structure', id: number }`.

### Steps (`src/index.ts` → `src/pipelines.ts` → `src/lib.ts`)

- **issue**: `prepare` (load + embed + find-similar) → **`moderate` ∥ `classify-tags` ∥ `map-sdgs`** (three parallel AI calls) → `finalize` (decide + persist tags/SDGs + audit + trust-score/ban) → on approval, the structural pass below.
- **structure**: `structure-prepare` → `structure-verdict` → `structure-apply` (dedup / reparent / convert-to-case-study). Also triggerable on its own (admin approve/appeal).
- **case-study**: `moderate` → on approval `curate` (replication-focused rewrite) → `finalize` (re-embed + persist).

Each `step.do` is durable and idempotent (the pipeline no-ops when the row is no longer
in the expected state), so retries and re-delivery are safe.

## One-time setup

The worker needs the AI keys + admin allowlist as secrets (synced from Doppler in CI;
set manually with `wrangler secret bulk`):

- `NUXT_OPENAI_API_KEY`, `NUXT_ANTHROPIC_API_KEY`, `NUXT_ADMIN_EMAILS`

It reads the database through the `HYPERDRIVE` binding (same Hyperdrive config as the
main Worker — prod vs staging selected by `wrangler.jsonc` env blocks). CI
(`.github/workflows/ci.yml`) deploys this Worker **before** the main Worker on every
`master`/`staging` push, because the main Worker's binding references it by `script_name`.

## Manual deploy

```sh
cd workers/moderation
wrangler deploy                 # production → communityfix-moderation         (Hyperdrive → Neon prod)
wrangler deploy --env staging   # staging    → communityfix-moderation-staging (Hyperdrive → Neon staging)
```

## Inspecting / triggering

```sh
wrangler workflows instances list moderation-staging
wrangler workflows instances describe moderation-staging latest
wrangler workflows trigger moderation-staging '{"kind":"issue","id":123}'
```
