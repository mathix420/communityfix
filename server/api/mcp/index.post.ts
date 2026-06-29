import { authenticateBearer, getOrigin } from '../../utils/oauth'
import {
  createCaseStudyAs,
  createIssueAs,
  createSolutionAs,
  getCaseStudyById,
  getIssueById,
  getMe,
  getTree,
  getUserProfile,
  listCaseStudiesFor,
  searchByQuery,
  searchTags,
  suggestMore,
  updateCaseStudyAs,
  updateIssueAs,
  updateSolutionAs,
} from '../../utils/mcp-tools'
import type { H3Event } from 'h3'
import { getWhitepaper } from '../../utils/whitepaper'
import { getGuide, listGuides } from '../../utils/mcp-guides'
import { formatZodIssues, mcpToolInputSchemas } from '../../utils/mcp-schemas'
import { rateLimit, assertRateLimit } from '../../utils/rate-limit'
import { CASE_STUDY_OUTCOMES, LOCATION_SCALES } from '../../database/schema'

const PROTOCOL_VERSION = '2025-06-18'
const SERVER_INFO = { name: 'communityfix-mcp', version: '0.2.0' }

// Per-authenticated-user rate limits (DB-backed fixed windows).
const RATE = {
  // Overall request guard — generous; just stops a runaway client.
  global: { limit: 300, windowSec: 60 },
  // Writes go through AI moderation, so they're the expensive path.
  write: { limit: 40, windowSec: 600 },
  // Search/suggest each spend an OpenAI embedding call.
  search: { limit: 60, windowSec: 60 },
} as const

const SERVER_INSTRUCTIONS = `CommunityFix is a tree of public issues and solutions, with case studies attached to solutions. Every node is one of:
- an **issue** — a problem worth solving, or a more specific facet of a parent issue (a "sub-issue")
- a **solution** — a proposed way to address its parent issue. Solutions are leaves in the tree: they cannot have sub-solutions.
- a **case study** — a structured record of one real-world implementation of a solution (where it was tried, by whom, what happened, metrics, sources, lessons). Case studies attach to a solution and are NOT part of the issue/solution tree.

Read \`get_whitepaper\` first if you need the platform's mission, principles, and how the catalog is meant to be used. Before authoring anything, read the relevant authoring guide via \`get_guide\` (call it with no \`slug\` to list guides, then fetch one — e.g. \`get_guide({ slug: "writing" })\` covers how to write good issues, solutions, and case studies, choose tags, and scope nodes).

Tools come in matched groups by node kind:
- create_issue / update_issue — for problems (top-level or sub-issue under any parent)
- create_solution / update_solution — for proposed approaches (always require parentId pointing at the issue they address; the parent must itself be an issue, not a solution)
- create_case_study / update_case_study / get_case_study / list_case_studies — for concrete deployments of a solution (require solutionId)

ALWAYS SEARCH BEFORE YOU CREATE.
Before calling any create_* tool, run search_issues_solutions (and search_tags) to find existing nodes that may already cover the same thing. The catalog must not fill up with near-duplicates. As a safety net the server itself re-checks: a create_* call that resembles an existing approved node will NOT create anything — it returns \`{ "status": "similar_found", "similar": [...] }\`. When that happens, inspect each candidate; if one already fits, use update_issue / update_solution / update_case_study (or attach a case study) instead. Only when you are confident none of them match should you re-issue the same create call with \`confirmNew: true\`.

Every issue and solution has two text fields:
- \`summary\` — required short plaintext card snippet (≤280 chars).
- \`description\` — optional long-form markdown body, no length limit.

THE SUMMARY IS NOT A TRUNCATED DESCRIPTION.
Write \`summary\` as a real, self-contained synopsis that captures the essence of the node and reads well on its own — not the first 280 characters of \`description\` with the rest cut off. If you have a long \`description\`, distill it into a complete, standalone sentence or two that fit within the 280-char limit. A reader who sees only the summary should still understand the whole point.

Case studies are structured instead: they have \`outcome\` (success / partial / failed / inconclusive / ongoing), required \`locationName\` + \`latitude\`/\`longitude\`, plus optional \`description\`, \`implementer\`, \`startDate\`/\`endDate\`, \`metrics\`, \`cost\`/\`currency\`/\`fundingSource\`, \`sources\`, \`lessonsLearned\`, \`links\`.

Solutions and case studies both accept a \`links\` array of \`{ url, title? }\` — use it to point at external resources hosting documents the platform itself does not store (GitHub repos, hosted PDFs, demo videos, Notion playbooks, photo albums). For case studies, keep \`sources\` for citations that back the claims; put supplementary artifacts in \`links\`. Do NOT use \`links\` for issues.

CRITICAL CONTENT RULE:
Both \`summary\` and \`description\` must cover ONLY the node itself — the problem (for an issue) or the proposed approach (for a solution). Keep each node tightly scoped.

Do NOT stuff a single node with:
- sub-problems, facets, or aspects of the problem → create child issues with create_issue
- alternative solutions, competing approaches, or variants → create sibling solutions with create_solution on the same parent issue
- evaluations of related work, "state of the art" surveys, lists of prior attempts → those are not part of one node's body
- pros/cons lists comparing approaches → each approach is its own solution
- concrete deployments of a solution (a city that did this, a pilot, an NGO program) → those are case studies — emit create_case_study against the solution

If you catch yourself writing headings like "Alternatives", "Sub-issues", "Why X did not work", "Other approaches", stop and emit additional create_issue / create_solution / create_case_study calls instead. A good node reads like a focused statement of one thing; a bad one reads like an essay covering the whole problem space.`

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: string | number | null
  method: string
  params?: unknown
}

interface JsonRpcSuccess { jsonrpc: '2.0', id: string | number | null, result: unknown }
interface JsonRpcFailure { jsonrpc: '2.0', id: string | number | null, error: { code: number, message: string, data?: unknown } }

const ERR = {
  PARSE: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL: -32603,
} as const

function ok(id: string | number | null, result: unknown): JsonRpcSuccess {
  return { jsonrpc: '2.0', id, result }
}
function fail(id: string | number | null, code: number, message: string, data?: unknown): JsonRpcFailure {
  return { jsonrpc: '2.0', id, error: { code, message, ...(data !== undefined ? { data } : {}) } }
}

// Tool behaviour hints (MCP `annotations`) so clients know what is safe to
// auto-run vs. confirm. Reads are idempotent; writes are not.
const READ = { readOnlyHint: true, idempotentHint: true, openWorldHint: false } as const
const CREATE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const
const UPDATE = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false } as const

// Output schemas are intentionally permissive (no `required`, extra keys
// allowed) so `structuredContent` always validates while still signalling the
// shape. create_/update_ tools may also return `{ status: "similar_found" }`.
const OUT_OBJECT = { type: 'object' as const }
const OUT_SEARCH = { type: 'object' as const, properties: { status: { type: 'string' }, results: { type: 'array' } } }
const OUT_PROFILE = {
  type: 'object' as const,
  properties: {
    id: { type: 'string' }, name: { type: ['string', 'null'] }, trustScore: { type: 'number' },
    issuesAuthored: { type: 'integer' }, solutionsAuthored: { type: 'integer' }, caseStudiesAuthored: { type: 'integer' },
  },
}

const links = {
  type: 'array',
  items: { type: 'object', properties: { url: { type: 'string' }, title: { type: 'string' } }, required: ['url'] },
}
const summaryDesc = 'Required short plaintext snippet of THIS node only — a real, standalone synopsis (≤280 chars), NOT the first 280 characters of `description`. Distill the description into a complete sentence or two that make sense on their own. Stay strictly in scope.'

const TOOLS = [
  {
    name: 'search_issues_solutions',
    title: 'Search issues & solutions',
    description: 'Semantic search across CommunityFix issues and solutions using vector embeddings. Use this for natural-language queries — it understands intent, not just keywords. ALWAYS run this before creating a new issue or solution to avoid duplicates.',
    annotations: READ,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural-language description of what to look for.' },
        type: { type: 'string', enum: ['issue', 'solution', 'any'], default: 'any', description: 'Restrict to issues, to solutions, or search both.' },
        limit: { type: 'integer', minimum: 1, maximum: 25, default: 10 },
      },
      required: ['query'],
    },
    outputSchema: OUT_SEARCH,
  },
  {
    name: 'get_issue',
    title: 'Get issue or solution',
    description: 'Fetch a single issue or solution by numeric id.',
    annotations: READ,
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'integer' } },
      required: ['id'],
    },
    outputSchema: OUT_OBJECT,
  },
  {
    name: 'get_tree',
    title: 'Get descendant tree',
    description: 'Return the full descendant tree rooted at the given issue or solution id — sub-issues and solutions recursively, with approved case studies attached as leaves under their parent solutions. Each row carries a `type` of "issue", "solution", or "case-study"; case-study rows expose `parentId` = the solution id and an `outcome` field. Capped at depth 10, 20 children per parent, and 500 nodes total.',
    annotations: READ,
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'integer', description: 'Root issue or solution id.' } },
      required: ['id'],
    },
    outputSchema: OUT_OBJECT,
  },
  {
    name: 'create_issue',
    title: 'Create issue',
    description: 'Create an issue — either top-level (omit `parentId`) or a sub-issue of an existing node (set `parentId`). A sub-issue is a narrower facet of its parent problem. Goes through AI moderation before becoming visible. To propose a solution to an existing issue, use `create_solution`.\n\nSEARCH FIRST: run `search_issues_solutions` before creating. If a similar issue already exists, update it instead. The server blocks near-duplicates and returns `{ status: "similar_found", similar: [...] }`; review those and only re-call with `confirmNew: true` if none match.\n\nSCOPE RULE: `summary` and `description` must cover ONLY this problem itself. Do not pack sub-problems, alternative framings, or surveys of related work — emit additional `create_issue` calls for sub-problems and `create_solution` calls for proposed approaches.',
    annotations: CREATE,
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'One-line statement of the problem.' },
        summary: { type: 'string', description: summaryDesc + ' This is the card-level pitch of the problem. Trimmed to 280 chars.' },
        description: { type: 'string', description: 'Optional markdown long-form body for THIS problem only: background, constraints, references, observed evidence. Do NOT enumerate sub-issues or proposed solutions here — emit additional `create_issue` or `create_solution` calls with `parentId` for those.' },
        parentId: { type: 'integer', description: 'Parent node id to nest under. Omit for a top-level issue.' },
        locationName: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        scale: { type: 'string', enum: [...LOCATION_SCALES] },
        confirmNew: { type: 'boolean', description: 'Set true only after reviewing `search_issues_solutions` results (or a prior `similar_found` response) and confirming no existing issue covers this. Required to create when the server detects a likely duplicate.' },
      },
      required: ['title', 'summary'],
    },
    outputSchema: OUT_OBJECT,
  },
  {
    name: 'create_solution',
    title: 'Create solution',
    description: 'Propose a solution to an existing issue. `parentId` is required and must point at an **issue** (not a solution — solutions cannot be nested). Goes through AI moderation before becoming visible. To create an issue (top-level or sub-issue), use `create_issue`. To document a concrete real-world implementation of a solution, attach a case study to it instead of creating a nested solution.\n\nSEARCH FIRST: run `search_issues_solutions` before creating. The server blocks near-duplicate solutions and returns `{ status: "similar_found", similar: [...] }`; review those and only re-call with `confirmNew: true` if none match.\n\nSCOPE RULE: `summary` and `description` must cover ONLY this proposed approach. Do not list alternative approaches, prior attempts, or comparisons — each alternative is its own `create_solution` call with the same `parentId`.',
    annotations: CREATE,
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'One-line statement of the proposed approach.' },
        summary: { type: 'string', description: summaryDesc + ' This is the card-level pitch of the approach. Trimmed to 280 chars.' },
        description: { type: 'string', description: 'Optional markdown long-form body for THIS approach only: mechanism, where it fits, operating profile, evidence. Do NOT survey alternative approaches or list sub-problems — emit additional `create_solution` (siblings) or `create_issue` (sub-problems) calls for those.' },
        parentId: { type: 'integer', description: 'Id of the issue this solution addresses. Required. Must be an issue, not a solution.' },
        locationName: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        scale: { type: 'string', enum: [...LOCATION_SCALES] },
        links: { ...links, description: 'External resources backing this solution (GitHub repos, design docs, demo videos, hosted PDFs). The platform does not store files itself.' },
        confirmNew: { type: 'boolean', description: 'Set true only after reviewing search results (or a prior `similar_found` response) and confirming no existing solution covers this. Required to create when the server detects a likely duplicate.' },
      },
      required: ['title', 'summary', 'parentId'],
    },
    outputSchema: OUT_OBJECT,
  },
  {
    name: 'update_issue',
    title: 'Update issue',
    description: 'Edit an existing issue. Only the author may update. Editing title/summary/description resends the node through moderation. To edit a solution, use `update_solution`; the call errors if `id` resolves to a solution.\n\nSCOPE RULE: same as `create_issue`. If an edit would introduce sub-problems or proposed approaches, do not append them here — create child nodes via `create_issue` / `create_solution` instead.',
    annotations: UPDATE,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        title: { type: 'string', description: 'One-line statement of the problem.' },
        summary: { type: 'string', description: summaryDesc },
        description: { type: 'string', description: 'Optional markdown long-form body for THIS problem only.' },
        locationName: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        scale: { type: 'string', enum: [...LOCATION_SCALES] },
      },
      required: ['id'],
    },
    outputSchema: OUT_OBJECT,
  },
  {
    name: 'update_solution',
    title: 'Update solution',
    description: 'Edit an existing solution. Only the author may update. Editing title/summary/description resends the node through moderation. To edit an issue, use `update_issue`; the call errors if `id` resolves to an issue.\n\nSCOPE RULE: same as `create_solution`. If an edit would introduce alternative approaches or sub-problems, do not append them here — create sibling/child nodes via `create_solution` / `create_issue` instead.',
    annotations: UPDATE,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        title: { type: 'string', description: 'One-line statement of the proposed approach.' },
        summary: { type: 'string', description: summaryDesc },
        description: { type: 'string', description: 'Optional markdown long-form body for THIS approach only.' },
        solutionStatus: { type: 'string', enum: ['plan', 'in-progress', 'done'], description: 'Lifecycle stage of the proposed approach.' },
        locationName: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        scale: { type: 'string', enum: [...LOCATION_SCALES] },
        links: { ...links, description: 'External resources backing this solution. Pass `[]` to clear.' },
      },
      required: ['id'],
    },
    outputSchema: OUT_OBJECT,
  },
  {
    name: 'suggest_more',
    title: 'Suggest related nodes',
    description: 'Suggest related issues/solutions semantically similar to a seed issue or solution. Uses the stored embedding of the seed for nearest-neighbor lookup.',
    annotations: READ,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'Seed issue or solution id.' },
        limit: { type: 'integer', minimum: 1, maximum: 25, default: 8 },
      },
      required: ['id'],
    },
    outputSchema: OUT_SEARCH,
  },
  {
    name: 'whoami',
    title: 'Get my profile',
    description: 'Return the authenticated user\'s public profile plus private fields (email, provider, ban state) and authored issue/solution counts. Use this when the user asks about "my" profile, credentials, or activity.',
    annotations: READ,
    inputSchema: { type: 'object', properties: {} },
    outputSchema: OUT_PROFILE,
  },
  {
    name: 'get_user',
    title: 'Get user profile',
    description: 'Public profile of any user by UUID: name, headline, bio, trust score, qualifications with endorsement counts, and counts of issues/solutions they\'ve authored.',
    annotations: READ,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'User UUID (e.g. the authorId field on an issue).' },
      },
      required: ['id'],
    },
    outputSchema: OUT_PROFILE,
  },
  {
    name: 'get_case_study',
    title: 'Get case study',
    description: 'Fetch a single case study by numeric id. Case studies document one real-world implementation of a solution (outcome, location, implementer, metrics, sources, lessons learned).',
    annotations: READ,
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'integer' } },
      required: ['id'],
    },
    outputSchema: OUT_OBJECT,
  },
  {
    name: 'list_case_studies',
    title: 'List case studies',
    description: 'List case studies under a node. Pass a solution id to get that solution\'s own case studies, or an issue id to aggregate case studies across all approved solution children of that issue. Returns rows ordered by verified (admin-marked) then most-recent first.',
    annotations: READ,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'Issue or solution id whose case studies to list.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_case_study',
    title: 'Create case study',
    description: 'Document one real-world implementation of a solution. `solutionId` is required and must point at a **solution** node. Use this — not create_solution — when you want to record that a specific place tried a solution and what happened. Fields are structured (outcome, location, dates, metrics, sources, lessons learned), not free-form markdown.\n\nSEARCH FIRST: check `list_case_studies` for the solution before adding one. The server blocks a case study that closely matches an existing one for the same solution and returns `{ status: "similar_found", similar: [...] }`; review those and only re-call with `confirmNew: true` if none match.\n\nSCOPE RULE: each case study covers ONE deployment in ONE place. If a solution has been tried in three different cities, that\'s three separate `create_case_study` calls — do not combine them.',
    annotations: CREATE,
    inputSchema: {
      type: 'object',
      properties: {
        solutionId: { type: 'integer', description: 'Id of the solution this case study implements. Required. Must be a solution, not an issue.' },
        outcome: { type: 'string', enum: [...CASE_STUDY_OUTCOMES], description: 'What happened: success, partial, failed, inconclusive, or ongoing.' },
        locationName: { type: 'string', description: 'Human-readable location label (e.g. "Bogotá, Colombia"). Required.' },
        latitude: { type: 'number', description: 'Decimal latitude of the deployment. Required.' },
        longitude: { type: 'number', description: 'Decimal longitude of the deployment. Required.' },
        scale: { type: 'string', enum: [...LOCATION_SCALES], description: 'Geographic scope of the deployment.' },
        description: { type: 'string', description: 'Optional markdown narrative — what was done, context, anything not captured by the structured fields.' },
        implementer: { type: 'string', description: 'Organization, agency, or person that ran the deployment.' },
        startDate: { type: 'string', description: 'ISO date (YYYY-MM-DD) the deployment started.' },
        endDate: { type: 'string', description: 'ISO date (YYYY-MM-DD) the deployment ended. Omit if ongoing.' },
        metrics: {
          type: 'array',
          description: 'Quantitative outcomes — one row per measurement.',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              baseline: { type: 'string' },
              result: { type: 'string' },
              unit: { type: 'string' },
            },
            required: ['label'],
          },
        },
        cost: { type: ['number', 'string'], description: 'Total cost as a number or numeric string.' },
        currency: { type: 'string', description: 'ISO currency code (e.g. "USD", "EUR").' },
        fundingSource: { type: 'string', description: 'Who paid for it.' },
        sources: {
          type: 'array',
          description: 'Citations / supporting links.',
          items: {
            type: 'object',
            properties: { url: { type: 'string' }, title: { type: 'string' } },
            required: ['url'],
          },
        },
        lessonsLearned: {
          type: 'array',
          description: 'One stand-alone takeaway per entry.',
          items: { type: 'string' },
        },
        links: {
          type: 'array',
          description: 'External resources documenting the deployment (GitHub repo, hosted PDF report, demo video, photo album). Use `sources` for citations backing claims; use `links` for supplementary artifacts.',
          items: {
            type: 'object',
            properties: { url: { type: 'string' }, title: { type: 'string' } },
            required: ['url'],
          },
        },
        confirmNew: { type: 'boolean', description: 'Set true only after confirming (via `list_case_studies`) that no existing case study already documents this deployment. Required to create when the server detects a likely duplicate.' },
      },
      required: ['solutionId', 'outcome', 'locationName', 'latitude', 'longitude'],
    },
    outputSchema: OUT_OBJECT,
  },
  {
    name: 'update_case_study',
    title: 'Update case study',
    description: 'Edit an existing case study. Only the author or an admin may update. The `verified` flag is admin-only — non-admin callers cannot change it. Pass only the fields you want to change.',
    annotations: UPDATE,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        outcome: { type: 'string', enum: [...CASE_STUDY_OUTCOMES] },
        locationName: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        scale: { type: 'string', enum: [...LOCATION_SCALES] },
        description: { type: 'string' },
        implementer: { type: 'string' },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
        metrics: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              baseline: { type: 'string' },
              result: { type: 'string' },
              unit: { type: 'string' },
            },
            required: ['label'],
          },
        },
        cost: { type: ['number', 'string'] },
        currency: { type: 'string' },
        fundingSource: { type: 'string' },
        sources: {
          type: 'array',
          items: {
            type: 'object',
            properties: { url: { type: 'string' }, title: { type: 'string' } },
            required: ['url'],
          },
        },
        lessonsLearned: { type: 'array', items: { type: 'string' } },
        links: {
          type: 'array',
          description: 'External artifacts. Pass `[]` to clear.',
          items: {
            type: 'object',
            properties: { url: { type: 'string' }, title: { type: 'string' } },
            required: ['url'],
          },
        },
        verified: { type: 'boolean', description: 'Admin-only: mark as independently verified.' },
      },
      required: ['id'],
    },
    outputSchema: OUT_OBJECT,
  },
  {
    name: 'search_tags',
    title: 'Search tags',
    description: 'Semantic tag search via embeddings — finds tags by meaning, not just substring. A query like "transportation" will surface "transit". Omit `query` to list all tags alphabetically. Falls back to case-insensitive substring match if the embedding service is unavailable. Useful before create_issue so you can reference existing tags rather than inventing strings.',
    annotations: READ,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural-language description of the tag. Omit for the full list.' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
    },
    outputSchema: OUT_SEARCH,
  },
  {
    name: 'get_whitepaper',
    title: 'Get CommunityFix whitepaper',
    description: 'Return the CommunityFix whitepaper (markdown): mission, problem statement, core principles, platform overview, incubation/revenue model, governance, and impact metrics. Read this to understand what the platform is for and how issues, solutions, and case studies are meant to be used before contributing.',
    annotations: READ,
    inputSchema: { type: 'object', properties: {} },
    outputSchema: {
      type: 'object',
      properties: { title: { type: 'string' }, url: { type: 'string' }, markdown: { type: 'string' } },
    },
  },
  {
    name: 'get_guide',
    title: 'Get authoring guide',
    description: 'Read the authoring guides for contributing high-quality content (how to write a good issue, solution, or case study; how to choose tags; how to scope nodes). Call with no `slug` to list available guides; pass a `slug` (e.g. "writing") to get the full markdown. CONSULT THE RELEVANT GUIDE BEFORE create_issue / create_solution / create_case_study.',
    annotations: READ,
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Guide slug to fetch (e.g. "writing"). Omit to list all available guides.' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        guides: { type: 'array', description: 'Present when no slug is passed: the list of available guides.' },
        slug: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        url: { type: 'string' },
        markdown: { type: 'string' },
      },
    },
  },
] as const

type ToolName = typeof TOOLS[number]['name']

interface ToolCtx { userId: string, clientId: string, event: H3Event }

function auditWrite(tool: string, ctx: ToolCtx, data: unknown) {
  const d = data as { id?: number, status?: string }
  console.log('[mcp.audit]', JSON.stringify({ tool, userId: ctx.userId, clientId: ctx.clientId, id: d?.id ?? null, status: d?.status ?? 'ok' }))
}

async function overToolRate(bucket: string, userId: string, cfg: { limit: number, windowSec: number }): Promise<string | null> {
  const r = await rateLimit({ bucket, identifier: userId, limit: cfg.limit, windowSec: cfg.windowSec })
  if (r.allowed) return null
  const retry = Math.max(1, Math.ceil((r.resetAt.getTime() - Date.now()) / 1000))
  return `Rate limit exceeded (${cfg.limit} per ${cfg.windowSec}s for ${bucket}). Retry in ${retry}s.`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- args validated by Zod below; per-case narrowing guards each contract
async function callTool(name: string, rawArgs: any, ctx: ToolCtx): Promise<{ content: Array<{ type: 'text', text: string }>, structuredContent?: Record<string, unknown>, isError?: boolean }> {
  const wrap = (data: unknown) => {
    const content = [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }]
    return (data && typeof data === 'object' && !Array.isArray(data))
      ? { content, structuredContent: data as Record<string, unknown> }
      : { content }
  }
  const wrapErr = (msg: string) => ({ content: [{ type: 'text' as const, text: msg }], isError: true })

  // Validate against the published schema before doing any work.
  const schema = mcpToolInputSchemas[name as ToolName]
  if (!schema) return wrapErr(`Unknown tool: ${name}`)
  const parsed = schema.safeParse(rawArgs ?? {})
  if (!parsed.success) return wrapErr(`Invalid arguments — ${formatZodIssues(parsed.error)}`)
  const args = rawArgs
  const { userId } = ctx

  try {
    switch (name as ToolName) {
      case 'search_issues_solutions': {
        const limited = await overToolRate('mcp_search', userId, RATE.search)
        if (limited) return wrapErr(limited)
        return wrap(await searchByQuery({ query: args.query, type: args.type, limit: args.limit }))
      }
      case 'get_issue': {
        const row = await getIssueById(args.id)
        return row ? wrap(row) : wrapErr(`Issue ${args.id} not found`)
      }
      case 'get_tree': {
        const tree = await getTree(args.id)
        return tree ? wrap(tree) : wrapErr(`Issue ${args.id} not found`)
      }
      case 'create_issue': {
        const limited = await overToolRate('mcp_write', userId, RATE.write)
        if (limited) return wrapErr(limited)
        const data = await createIssueAs(userId, args)
        auditWrite('create_issue', ctx, data)
        return wrap(data)
      }
      case 'create_solution': {
        const limited = await overToolRate('mcp_write', userId, RATE.write)
        if (limited) return wrapErr(limited)
        const data = await createSolutionAs(userId, args)
        auditWrite('create_solution', ctx, data)
        return wrap(data)
      }
      case 'update_issue': {
        const limited = await overToolRate('mcp_write', userId, RATE.write)
        if (limited) return wrapErr(limited)
        const data = await updateIssueAs(userId, args)
        auditWrite('update_issue', ctx, data)
        return wrap(data)
      }
      case 'update_solution': {
        const limited = await overToolRate('mcp_write', userId, RATE.write)
        if (limited) return wrapErr(limited)
        const data = await updateSolutionAs(userId, args)
        auditWrite('update_solution', ctx, data)
        return wrap(data)
      }
      case 'suggest_more': {
        const limited = await overToolRate('mcp_search', userId, RATE.search)
        if (limited) return wrapErr(limited)
        return wrap(await suggestMore(args.id, args.limit))
      }
      case 'whoami': {
        const me = await getMe(userId)
        return me ? wrap(me) : wrapErr('Your user record was not found')
      }
      case 'get_user': {
        const profile = await getUserProfile(args.id, userId)
        return profile ? wrap(profile) : wrapErr(`User ${args.id} not found`)
      }
      case 'search_tags': {
        const limited = await overToolRate('mcp_search', userId, RATE.search)
        if (limited) return wrapErr(limited)
        return wrap(await searchTags({ query: args?.query, limit: args?.limit }))
      }
      case 'get_case_study': {
        const row = await getCaseStudyById(args.id)
        return row ? wrap(row) : wrapErr(`Case study ${args.id} not found`)
      }
      case 'list_case_studies': {
        const rows = await listCaseStudiesFor(args.id)
        return rows === null ? wrapErr(`Issue or solution ${args.id} not found`) : wrap(rows)
      }
      case 'create_case_study': {
        const limited = await overToolRate('mcp_write', userId, RATE.write)
        if (limited) return wrapErr(limited)
        const data = await createCaseStudyAs(userId, args)
        auditWrite('create_case_study', ctx, data)
        return wrap(data)
      }
      case 'update_case_study': {
        const limited = await overToolRate('mcp_write', userId, RATE.write)
        if (limited) return wrapErr(limited)
        const data = await updateCaseStudyAs(userId, args)
        auditWrite('update_case_study', ctx, data)
        return wrap(data)
      }
      case 'get_whitepaper': {
        return wrap(getWhitepaper())
      }
      case 'get_guide': {
        if (args.slug) {
          const guide = await getGuide(ctx.event, args.slug)
          return guide ? wrap(guide) : wrapErr(`Guide "${args.slug}" not found. Call get_guide with no slug to list available guides.`)
        }
        return wrap({ guides: await listGuides(ctx.event) })
      }
      default:
        return wrapErr(`Unknown tool: ${name}`)
    }
  }
  catch (err) {
    const message = (err as { statusMessage?: string, message?: string })?.statusMessage
      ?? (err as { message?: string })?.message
      ?? 'Tool execution failed'
    console.error(`[mcp.tools/call ${name}]`, err)
    return wrapErr(message)
  }
}

async function dispatch(req: JsonRpcRequest, ctx: ToolCtx): Promise<JsonRpcSuccess | JsonRpcFailure | null> {
  const id = req.id ?? null
  const isNotification = req.id === undefined

  switch (req.method) {
    case 'initialize': {
      const result = {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: SERVER_INSTRUCTIONS,
      }
      return isNotification ? null : ok(id, result)
    }
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null
    case 'ping':
      return isNotification ? null : ok(id, {})
    case 'tools/list':
      return isNotification ? null : ok(id, { tools: TOOLS })
    case 'tools/call': {
      const params = (req.params ?? {}) as { name?: unknown, arguments?: unknown }
      const toolName = params.name
      const args = (params.arguments ?? {}) as Record<string, unknown>
      if (typeof toolName !== 'string') {
        return fail(id, ERR.INVALID_PARAMS, 'tools/call requires a `name` string')
      }
      const result = await callTool(toolName, args, ctx)
      return isNotification ? null : ok(id, result)
    }
    case 'resources/list':
      return isNotification ? null : ok(id, { resources: [] })
    case 'prompts/list':
      return isNotification ? null : ok(id, { prompts: [] })
    default:
      return isNotification ? null : fail(id, ERR.METHOD_NOT_FOUND, `Method ${req.method} not found`)
  }
}

export default defineEventHandler(async (event) => {
  const authed = await authenticateBearer(event)
  if (!authed) {
    setHeader(event, 'www-authenticate', `Bearer realm="MCP", resource_metadata="${getOrigin(event)}/.well-known/oauth-protected-resource"`)
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: { error: 'invalid_token', error_description: 'A valid OAuth access token is required.' },
    })
  }

  // Per-user request guard (throws 429 with Retry-After when exhausted).
  await assertRateLimit(event, { bucket: 'mcp_global', identifier: authed.user.id, ...RATE.global })

  setHeader(event, 'content-type', 'application/json')
  setHeader(event, 'cache-control', 'no-store')

  let body: unknown
  try {
    body = await readBody(event)
  }
  catch {
    return fail(null, ERR.PARSE, 'Invalid JSON body')
  }

  const ctx: ToolCtx = { userId: authed.user.id, clientId: authed.token.clientId, event }
  const batch = Array.isArray(body) ? body : [body]
  if (batch.length === 0) return fail(null, ERR.INVALID_REQUEST, 'Empty batch')

  const responses: Array<JsonRpcSuccess | JsonRpcFailure> = []
  for (const item of batch) {
    if (!item || typeof item !== 'object' || (item as JsonRpcRequest).jsonrpc !== '2.0' || typeof (item as JsonRpcRequest).method !== 'string') {
      responses.push(fail((item as JsonRpcRequest)?.id ?? null, ERR.INVALID_REQUEST, 'Malformed JSON-RPC request'))
      continue
    }
    const out = await dispatch(item as JsonRpcRequest, ctx)
    if (out) responses.push(out)
  }

  if (responses.length === 0) {
    setResponseStatus(event, 202)
    return null
  }
  return Array.isArray(body) ? responses : responses[0]
})
