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

### Steps (`src/index.ts` → `src/pipelines.ts` + `src/steps/<kind>/*.yaml` → `src/lib.ts`)

- **issue** (also solutions): `prepare` (load + embed + find-similar) → **`moderate` ∥ `classify-tags` ∥ `map-sdgs`** (three parallel AI calls) → `finalize` (decide + persist tags/SDGs + audit + trust-score/ban) → on approval, the **enrich** pass (**`curate` → `apply-curate` ∥ `resolve-location` → `apply-location`**) → the structural pass below.
- **structure**: `structure-prepare` → `structure-verdict` → `structure-apply` (dedup / reparent / convert-to-case-study). Also triggerable on its own (admin approve/appeal).
- **case-study**: `prepare` (load + build prompt inputs) → `moderate` → on rejection `reject`; on approval **`curate` (replication-focused rewrite) ∥ `resolve-location` → `apply-location`** → `finalize` (re-embed + persist).

Each `step.do` is durable and idempotent (the pipeline no-ops when the row is no longer
in the expected state), so retries and re-delivery are safe. The **enrich** steps
(`curate`, `resolve-location`) are **best-effort** — a failure there is logged and skipped,
never undoing the approval.

#### Curate & location (issues, solutions, and case studies)

- **`curate`** tightens an approved node. Case studies use `case-study.curate` (strip to
  replication-relevant fields); issues/solutions use `issue.curate` (rewrite `summary` +
  `description`, preserving meaning + language, never inventing). When the summary changes
  the node is re-embedded before the structural pass. Logged as a `curate` audit entry.
- **`resolve-location`** is an **agentic** step (`location.resolve`): the model drives a
  `geocode` tool (OpenStreetMap Nominatim, multiple queries allowed) to find the candidate
  whose area best matches the node's text, then names it by `place_id`. `apply-location`
  persists that candidate's centroid **point** + GeoJSON **`area`** (the new `area` jsonb
  column on `issues` / `case_studies`) and logs a `relocate` audit entry (`needs_review`).
  Replay-safe: the resolve step returns the fully-resolved point+area, so it never depends
  on the in-memory geocode cache surviving a Workflow replay. Conservative — only relocates
  when a geocoded candidate is clearly better and confidence ≥ 0.7.

### Prompt steps (`src/steps/<kind>/*.yaml`)

Every AI call is a YAML step file holding its `system` / `user` prompt templates, the
structured-output `schema` (JSON Schema), `model`, `maxTokens`, and a `version` (bumped on
prompt edits and logged into `auditLogs.details.promptVersion` so a decision can be traced
to the exact prompt that produced it). The orchestration in `index.ts` calls
`runStep(anthropic, '<id>', vars)` (`src/steps.ts`); the imperative `prepare*` / `finalize*`
steps in `pipelines.ts` build the `vars` and own all DB writes — no prompts live in code.

- **Agentic steps** declare `tools: [...]` and run via `runAgent(...)` instead of `runStep`:
  the model may call the listed tools across turns, then calls a synthesized `submit_result`
  tool whose schema is the step's `schema`. `location.resolve` uses this with the `geocode`
  tool (`src/geocode.ts`). Single-shot steps omit `tools` and use the structured-output path.
- Prompts use `{{slot}}` substitution; `render()` throws on an unfilled slot. Lists
  (available tags/SDGs, similar-item context) are pre-rendered in the `prepare*` steps.
- Files are **bundled as text** (`rules: [{ type: "Text", globs: ["**/*.yaml"] }]` in
  `wrangler.jsonc`) and parsed + Zod-validated once at module init in `steps.ts`.
- `tests/unit/moderation-steps.test.ts` loads + validates every file, guards the
  `case-study.curate` scale enum against `LOCATION_SCALES`, and snapshots the rendered
  prompts so wording changes surface in review.
- To tune a prompt: edit the YAML, bump `version`, run `bunx vitest run tests/unit` and
  update the snapshot if the change is intentional.

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
