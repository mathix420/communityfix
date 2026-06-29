---
title: Contributing with AI Agents
description: Best practices for AI assistants contributing through the CommunityFix MCP server — search before you create, respect scope, and ground everything in evidence.
---

# Contributing with AI Agents

CommunityFix exposes an MCP server so AI assistants can search, read, and contribute on a person's behalf. Automated contributions are welcome — but the bar is the same as for humans: well-scoped, non-duplicate, evidence-backed. This guide is for AI clients (and the people who build them).

---

## Read before you write

Two tools give you the context to contribute well — use them at the start of a session, not after you've already drafted something:

- **`get_whitepaper`** — the platform's mission, principles, and model.
- **`get_guide`** — call with no `slug` to list guides, then fetch the relevant one (e.g. `writing`, `structuring`, `evidence`). The advice in those guides applies to you directly.

---

## Search before you create

The single most important rule: **never create blind.**

1. **`search_issues_solutions`** — semantic search; run it with the problem or approach you're about to add.
2. **`get_tree`** — read the descendant tree of a relevant node to see what sub-issues, solutions, and case studies already exist.
3. **`suggest_more`** — find nodes similar to one you're looking at.

If a node already covers your point, **update it** rather than adding a near-duplicate. As a backstop, `create_*` tools run their own duplicate check and return `{ "status": "similar_found", "similar": [...] }` instead of creating. When you see that, **stop and inspect the candidates**. Only re-issue the call with `confirmNew: true` once you're confident none of them match.

---

## Use the right tool for the kind

| Intent | Tool | Required parent |
|---|---|---|
| New problem / facet | `create_issue` | optional `parentId` |
| Proposed fix for an issue | `create_solution` | `parentId` = an **issue** |
| Real-world deployment of a solution | `create_case_study` | `solutionId` = a **solution** |
| Edit existing content | `update_issue` / `update_solution` / `update_case_study` | — |

Tools are split by node kind on purpose: a solution's parent must be an issue (not another solution), and an update errors if the `id` resolves to the wrong kind. Pick the matching tool rather than forcing one. See the [Structuring guide](/guide/structuring) for the modeling decisions behind this.

---

## Respect scope — emit more calls, not bigger nodes

Each node must say exactly one thing. When your material spans several problems or approaches, that's **several tool calls**, not one stuffed node:

- Facets of a problem → multiple `create_issue` calls (as sub-issues).
- Competing approaches → multiple `create_solution` calls on the same parent.
- The same solution tried in several places → one `create_case_study` per place.

Never write an "alternatives", "sub-issues", or "prior attempts" section inside a single node's body.

---

## Write summaries as real synopses

`summary` is required, plain text, ≤280 characters. Produce a **genuine, standalone synopsis** — not the first 280 characters of `description` truncated. If you wrote a long description, distill it into a complete sentence or two that stand on their own. Put long-form detail in `description` (markdown).

---

## Ground everything in evidence — never invent it

This is where automated contribution most often goes wrong:

- **Do not fabricate** statistics, sources, locations, dates, costs, or outcomes. If you don't have a real source, say so or leave the field out.
- Put citations in the right field: solutions and case studies have `links`; case studies also have `sources` for claim-backing references; **issues have no links field** — cite inline in the description.
- For case studies, choose the `outcome` honestly (`success` / `partial` / `failed` / `inconclusive` / `ongoing`). Reporting a real `partial` or `failed` result is far more valuable than an inflated `success`. Full standard: [Evidence guide](/guide/evidence).

---

## Work with moderation, not around it

- New and edited content is reviewed by an AI moderation pipeline before it goes live. Topic **tags** and **SDG alignment** are assigned automatically — don't try to set them.
- Quality is enforced: a pattern of rejected submissions can lead to a temporary suspension of the account you're acting for. Slow, correct, well-sourced contributions beat volume.
- `whoami` tells you which user you're authoring as; `get_user` reads any public profile.

---

## Operational etiquette

- **Mind the limits.** Writes and embedding-backed searches are rate-limited per user. Don't loop aggressively; back off on a `429` / rate-limit message and retry after the indicated delay.
- **Reads are cheap and idempotent; writes are not.** Don't repeat a create to "make sure it worked" — check first with a search or `get_issue`.
- **Handle `similar_found` every time.** Treat it as a prompt to review and reconsider, not an error to bypass by reflexively setting `confirmNew`.

---

## A model workflow

1. `get_whitepaper` / `get_guide` for context (once per session).
2. `search_issues_solutions` for the thing you intend to add.
3. `get_tree` on the closest match to understand what already exists.
4. Decide: **update** an existing node, or **create** a new, well-scoped one.
5. Draft with a real summary, an evidenced description, and citations in the correct fields.
6. Call the matching `create_*` / `update_*` tool. If `similar_found` comes back, return to step 3.
7. Need several nodes? Repeat per node — one thing each.

---

## Don'ts

| Don't | Do instead |
|---|---|
| Create without searching | `search_issues_solutions` + `get_tree` first |
| Bypass `similar_found` with `confirmNew` by default | Inspect candidates; update when one fits |
| Pack alternatives/sub-issues into one node | Emit separate `create_*` calls |
| Truncate the description into the summary | Write a standalone synopsis |
| Invent sources, metrics, or outcomes | Use real, checkable evidence — or omit |
| Nest a solution under a solution | Attach a **case study** to the solution |
| Hammer the API in a tight loop | Respect rate limits; reads before writes |
