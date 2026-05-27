---
title: MCP Server - CommunityFix
description: Connect Claude Desktop, IDEs, and other AI clients to CommunityFix through the Model Context Protocol.
---

# MCP Server

CommunityFix ships a [Model Context Protocol](https://modelcontextprotocol.io/) server so any compatible AI client — Claude Desktop, Claude Code, Cursor, your own agent — can search the tree, read issues and solutions, and create new ones on your behalf.

The endpoint is:

```
https://communityfix.org/api/mcp
```

Authentication is OAuth 2.1 with PKCE, handled by CommunityFix directly. You log in once in your browser, approve the connection, and the client keeps a refresh token from then on.

## Connect from Claude Desktop

Open `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or the equivalent on your platform and add an entry under `mcpServers`:

```json
{
  "mcpServers": {
    "communityfix": {
      "url": "https://communityfix.org/api/mcp"
    }
  }
}
```

Restart Claude Desktop. The first tool call opens a browser tab where you sign in and approve the connection; subsequent calls reuse the refresh token automatically.

## Connect from Claude Code

```bash
claude mcp add --transport http communityfix https://communityfix.org/api/mcp
```

The same browser-based OAuth flow runs on the first call.

## Connect from other clients

Any MCP client that supports remote servers with OAuth 2.1 + PKCE works. Point it at `https://communityfix.org/api/mcp` — the client discovers everything else from the standard well-known endpoints:

- `/.well-known/oauth-protected-resource`
- `/.well-known/oauth-authorization-server`

Clients self-register via `POST /oauth/register` ([RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591)) — there is no client ID to copy around manually.

## Available tools

| Tool | What it does |
| --- | --- |
| `search_issues_solutions` | Semantic + lexical search across all issues and solutions. |
| `get_issue` | Fetch a single issue or solution by ID. |
| `get_tree` | Walk the children of a node (issues and their solutions, recursively). |
| `create_issue` | Author a new top-level issue or sub-issue. |
| `create_solution` | Propose a solution under an existing issue. |
| `update_issue` / `update_solution` | Edit a node you have permission to modify. |
| `create_case_study` / `update_case_study` | Record a real-world implementation of a solution. |
| `get_case_study` / `list_case_studies` | Read existing case studies. |
| `suggest_more` | Get related issues or solutions for a node. |
| `whoami` / `get_user` | Identify the authenticated user or fetch a public profile. |
| `search_tags` | Tag autocomplete. |

Every issue and solution has two text fields: a required `summary` (plaintext, ≤280 characters) and an optional `description` (markdown, no length limit). Case studies are structured — outcome, location, dates, metrics, sources, lessons learned.

## What you're approving

When you approve the connection, the client gets a bearer token tied to your account. While it's valid, the client can do anything you can do through the website — read public content, create issues and solutions in your name, edit your own nodes, attach case studies. It cannot change your account settings, see other users' private data, or impersonate other users.

Tokens last one hour and refresh transparently. Refresh tokens rotate on every use, so a leaked token stops working as soon as the legitimate client refreshes once.

## Revoking access

There is no per-client revocation UI yet. If you need to cut a client off, sign out of CommunityFix and contact us — we can drop the row in `oauth_clients` for you, which cascades to all of that client's tokens.

## Source

The MCP implementation lives in [`server/utils/mcp-tools.ts`](https://github.com/mathix420/communityfix/blob/master/server/utils/mcp-tools.ts) and [`server/api/mcp/index.post.ts`](https://github.com/mathix420/communityfix/blob/master/server/api/mcp/index.post.ts). It is MIT-licensed like the rest of CommunityFix — feedback and PRs welcome.
