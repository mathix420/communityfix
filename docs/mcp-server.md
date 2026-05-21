# MCP Server — Production Setup

CommunityFix exposes a [Model Context Protocol](https://modelcontextprotocol.io/) server at `POST /api/mcp` so AI clients (Claude Desktop, IDE plugins, etc.) can search, browse, and create issues and solutions on a user's behalf.

Authorization is OAuth 2.1 + PKCE served directly by this app — there is no separate identity provider to provision.

## What ships with the app

- **Discovery endpoints**
  - `GET /.well-known/oauth-protected-resource`
  - `GET /.well-known/oauth-authorization-server`
- **OAuth endpoints**
  - `POST /oauth/register` — dynamic client registration ([RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591)), public clients only, PKCE required
  - `GET /oauth/authorize` — HTML consent screen
  - `POST /oauth/authorize` — consent submission
  - `POST /oauth/token` — `authorization_code` and `refresh_token` grants
- **MCP endpoint**
  - `POST /api/mcp` — JSON-RPC, bearer-token authenticated

The discovery responses use the deployment's own origin (derived from the request's `Host` header by `getOrigin()` in `server/utils/oauth.ts`), so no environment configuration is needed for URLs — every preview deployment is self-hosting.

## Production checklist

The MCP server itself is just a route, so the production setup is mostly the same as any other Workers deployment. The MCP-specific bits:

### 1. Apply the database migrations

The MCP feature introduces four migrations on top of `0006`:

| File | What it adds |
| --- | --- |
| `0007_cool_peter_quill.sql` | `oauth_clients`, `oauth_codes`, `oauth_tokens` tables and indexes |
| `0008_mixed_richard_fisk.sql` | Schema tweaks pulled in alongside the OAuth tables |
| `0009_strong_bloodaxe.sql` | Schema tweaks pulled in alongside the OAuth tables |
| `0010_rename_description_to_summary.sql` | Renames `issues.description` → `summary` and adds an optional `description` column for long-form markdown. MCP tools depend on both fields existing. |

Apply against the **direct (non-pooled)** Neon URL — Hyperdrive can't run DDL.

```bash
# Use the production Doppler config and the direct (non-pooled) connection
doppler run -c prd -- bash -c '
  export NUXT_DATABASE_URL="$NUXT_DATABASE_URL_DIRECT" &&
  bun run db:migrate
'
```

Runtime traffic continues to flow through the existing `HYPERDRIVE` binding on the pooled URL — the Workers preset hydrates `NUXT_DATABASE_URL` from the binding in `server/plugins/hyperdrive.ts`.

### 2. Required Doppler secrets

The MCP server doesn't introduce new secrets, but every secret the rest of the app reads must also be present in the production Doppler config:

| Secret | Used by | Notes |
| --- | --- | --- |
| `NUXT_DATABASE_URL` | Drizzle / app runtime | Already set; runtime uses the Hyperdrive-pooled URL injected at request time. |
| `NUXT_DATABASE_URL_DIRECT` | One-off migrations only | The direct (non-pooled) Neon URL. Not bound at runtime. |
| `NUXT_SESSION_PASSWORD` | `nuxt-auth-utils` | Used to seal the session cookie that the `/oauth/authorize` consent screen depends on. Must be ≥ 32 chars. |
| `NUXT_OPENAI_API_KEY` | Embeddings / similar-issue search | `search_issues_solutions` calls OpenAI to embed the query. |
| `NUXT_ADMIN_EMAILS` | `server/utils/admin.ts` | Comma-separated list. Admins bypass the endorsement trust gate. |

No `OAUTH_*` secrets are needed — clients self-register via `POST /oauth/register`, and token signing isn't used (tokens are opaque, stored sha256-hashed in `oauth_tokens`).

### 3. Cloudflare bindings

`nuxt.config.ts` already declares two production bindings the MCP flow depends on:

- `HYPERDRIVE` — pooled Neon connection used by every request that touches the DB (issue search, tool execution, OAuth code/token lookups).
- `KV_AUTH` — Cloudflare KV namespace mounted at the Nitro `auth` storage namespace. Used by `nuxt-auth-utils` for the WebAuthn challenge round-trip and for the `mcp_continue` cookie helper that bounces unauthenticated `/oauth/authorize` requests through `/login` and back.

Both bindings are emitted into the generated `wrangler.json` by Nitro's `cloudflare-module` preset. Verify after a build:

```bash
bun run build
cat .output/server/wrangler.json | jq '.hyperdrive, .kv_namespaces'
```

The IDs are branched by `WORKERS_CI_BRANCH` (master → prod, anything else → staging). The GitHub Actions deploy workflow sets that var explicitly per job; if you're cutting a one-off deploy from a third long-lived branch, add a case to the `process.env.WORKERS_CI_BRANCH` checks in `nuxt.config.ts` and a matching job in `.github/workflows/ci.yml`.

### 4. CORS / proxy posture

`/api/mcp`, `/oauth/*`, and `/.well-known/*` need to be reachable from the AI client. No special CORS work is required for desktop clients (they don't enforce CORS), but if you front the app with a proxy that strips `Authorization` headers or rewrites the `Host` header you'll break the bearer-token flow and the discovery URLs.

## Available tools

All tools live in `server/utils/mcp-tools.ts`. The JSON-RPC plumbing is in `server/api/mcp/index.post.ts`.

| Tool | What it does |
| --- | --- |
| `search_issues_solutions` | Vector + lexical search across issues and solutions. |
| `get_issue` | Fetch a single issue or solution by ID. |
| `get_tree` | Recursive children of a node (capped depth, fan-out, and total nodes). |
| `create_issue` / `create_solution` | Author a new node. Solutions require `parentId`. |
| `update_issue` / `update_solution` | Edit an existing node. Errors if the `id` resolves to the other kind. |
| `suggest_more` | Recommend related issues / solutions. |
| `whoami` | Return the authenticated user. |
| `get_user` | Fetch a public profile by ID. |
| `search_tags` | Tag autocomplete. |

Every text field follows the schema split: `summary` is required, plaintext, and capped at 280 chars; `description` is optional and accepts markdown.

## How a client authorizes

1. Client hits `GET /.well-known/oauth-protected-resource` to discover the authorization server.
2. Client hits `GET /.well-known/oauth-authorization-server` to discover endpoints.
3. Client `POST`s to `/oauth/register` with a `redirect_uris` array. Public clients only (PKCE-required, no `client_secret` issued). Allowed redirect schemes: `https://`, `http://localhost`, or custom schemes — see [OAuth 2.1 native-app rules](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12#name-loopback-interface-redirect).
4. Client opens a browser to `/oauth/authorize?...` with `code_challenge`. Unauthenticated visitors are redirected through `/login` and resumed via the `mcp_continue` cookie. Authenticated visitors see an HTML consent screen.
5. On approval, the user is redirected to the client's `redirect_uri` with an `?code=...`.
6. Client `POST`s the code to `/oauth/token` with the `code_verifier`. The token endpoint returns a bearer access token (1 h TTL) and a refresh token (rotates on every use).
7. Client calls `POST /api/mcp` with `Authorization: Bearer <token>`.

Access tokens are opaque and stored sha256-hashed in `oauth_tokens` — a database dump never exposes a usable bearer.

The only scope is `mcp` (see `OAUTH_SCOPE` in `server/utils/oauth.ts`); the consent screen lists the permissions textually rather than per-scope.

## Connecting from Claude Desktop

In `~/Library/Application Support/Claude/claude_desktop_config.json` (or the equivalent on your platform), add an entry under `mcpServers`:

```json
{
  "mcpServers": {
    "communityfix": {
      "url": "https://communityfix.org/api/mcp"
    }
  }
}
```

Claude Desktop will then walk the discovery + OAuth flow described above on its own. The first call pops a browser tab for consent; subsequent calls reuse the refresh token.

## Operational notes

- **Token cleanup.** Expired rows in `oauth_codes` and `oauth_tokens` are never auto-purged. They're cheap, but if the tables grow uncomfortably large, run a maintenance query that deletes rows where `expires_at < now() - interval '7 days'`.
- **Revoking a client.** `DELETE FROM oauth_clients WHERE id = '<client_id>'` cascades into `oauth_codes` and `oauth_tokens` thanks to the FKs in `0007_cool_peter_quill.sql`.
- **Replay protection.** OAuth codes are single-use — the same `UPDATE` marks them consumed; a replay matches nothing. Don't be tempted to "soft delete" by setting `consumed_at` separately.
- **Refresh-token rotation.** Every `refresh_token` grant returns a new refresh token and invalidates the old one. If a client sees a refresh failure, the correct response is to drop the saved tokens and start the authorization flow over — do not loop on the failing refresh.
