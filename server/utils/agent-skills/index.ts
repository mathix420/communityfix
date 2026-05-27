// Catalog of agent skills published at /.well-known/agent-skills/.
// Each entry holds the SKILL.md body inline so we can both serve it
// raw and compute a stable sha256 digest for the discovery index.
export interface AgentSkill {
  name: string
  slug: string
  type: string
  description: string
  body: string
}

export const AGENT_SKILLS: AgentSkill[] = [
  {
    name: 'submit-issue',
    slug: 'submit-issue',
    type: 'workflow',
    description: 'Formulate and submit a well-scoped community issue (problem statement) to CommunityFix.',
    body: `# Skill: Submit a CommunityFix issue

## When to use
You want to register a problem worth solving so the community can propose solutions against it.

## Inputs
- title: one-line problem statement
- summary: ≤280-char card snippet (plaintext)
- description: optional markdown long-form context
- parentId: optional; set if this is a sub-issue of an existing problem
- locationName, latitude, longitude, scale: optional; scope the issue to a place

## Steps
1. Authenticate via the MCP server using OAuth 2.1 + PKCE.
   - Resource:        https://communityfix.org/api/mcp
   - Authorization:   https://communityfix.org/oauth/authorize
   - Token:           https://communityfix.org/oauth/token
   - Discovery:       https://communityfix.org/.well-known/oauth-authorization-server
2. Call the \`create_issue\` MCP tool with your inputs.
3. Inspect the returned id. The node lands in moderation and is publicly visible only after approval.

## Scope rule (important)
The summary and description must cover ONLY the problem itself.
- Sub-problems → emit additional \`create_issue\` calls with \`parentId\`.
- Proposed approaches → emit \`create_solution\` calls with \`parentId\`.
- Real-world deployments → emit \`create_case_study\` calls against a solution.

If you catch yourself writing "Alternatives" or "Sub-issues" sections, split the node.
`,
  },
  {
    name: 'propose-solution',
    slug: 'propose-solution',
    type: 'workflow',
    description: 'Propose a solution to an existing CommunityFix issue.',
    body: `# Skill: Propose a CommunityFix solution

## When to use
You want to describe a single approach for addressing an existing issue.

## Inputs
- title: one-line statement of the approach
- summary: ≤280-char plaintext card snippet
- description: optional markdown body
- parentId: REQUIRED, must point at an **issue** (solutions cannot nest)
- links: optional [{ url, title? }] — external resources backing the solution
- locationName, latitude, longitude, scale: optional

## Steps
1. Authenticate (see submit-issue skill).
2. Confirm \`parentId\` resolves to an issue with \`get_issue\`. If it is itself a solution, you cannot nest under it.
3. Call \`create_solution\` with your inputs.
4. The solution goes through AI moderation before becoming public.

## Scope rule
One solution = one approach. Alternative approaches are sibling solutions sharing the same \`parentId\`.
Concrete deployments of the approach are NOT part of the solution body — emit \`create_case_study\` for those.
`,
  },
  {
    name: 'document-case-study',
    slug: 'document-case-study',
    type: 'workflow',
    description: 'Document a real-world implementation of a CommunityFix solution.',
    body: `# Skill: Document a case study

## When to use
A solution has been tried somewhere (city, NGO program, pilot, demo) and you want to record what happened.

## Required inputs
- solutionId: id of the solution this case study implements
- outcome: success | partial | failed | inconclusive | ongoing
- locationName, latitude, longitude

## Optional inputs
- description: long-form markdown
- implementer: who ran it
- startDate, endDate
- metrics: [{ label, baseline?, result?, unit? }]
- cost, currency, fundingSource
- sources: [{ url, title? }] — citations that back the claims
- lessonsLearned: string[]
- links: [{ url, title? }] — supplementary artifacts (repos, videos, decks)

## Steps
1. Authenticate (see submit-issue skill).
2. Verify the solution exists with \`get_issue\`.
3. Call \`create_case_study\` with your inputs.
4. Goes through AI moderation before public listing.

## Tip
Keep \`sources\` for evidence and \`links\` for context. Don't conflate them.
`,
  },
  {
    name: 'search-and-browse',
    slug: 'search-and-browse',
    type: 'reference',
    description: 'Search and browse the CommunityFix tree of issues, solutions, and case studies.',
    body: `# Skill: Search and browse CommunityFix

## Read-only tools (no auth required for public data via MCP, but auth is still recommended)

- \`search_issues_solutions\`: vector search; pass a natural-language \`query\` and optional \`type\` (issue|solution|any).
- \`suggest_more\`: returns semantically similar nodes to a given id.
- \`get_issue\`: fetch a single node by integer id.
- \`get_tree\`: full descendant tree under an id (capped at depth 10, 500 nodes).
- \`list_case_studies\`: case studies attached to a solution.
- \`get_case_study\`: a single case study.
- \`search_tags\`: search the tag taxonomy.

## Recommended exploration pattern
1. Start with \`search_issues_solutions\` for the user's natural-language intent.
2. For interesting hits, call \`get_tree\` to see sub-issues, solutions, and case studies.
3. Use \`suggest_more\` to lateral-link to adjacent problem spaces.

## Public HTTP fallback (no auth)
- Homepage:           https://communityfix.org/
- Issue / solution:   https://communityfix.org/issue/{id}
- Case study:         https://communityfix.org/case-study/{id}
- Tag page:           https://communityfix.org/tag/{slug}

Each of those pages also supports \`Accept: text/markdown\` for a markdown rendering.
`,
  },
  {
    name: 'mcp-integration',
    slug: 'mcp-integration',
    type: 'reference',
    description: 'Connect an MCP client to the CommunityFix MCP server using OAuth 2.1 + PKCE.',
    body: `# Skill: Connect to the CommunityFix MCP server

## Endpoint
\`POST https://communityfix.org/api/mcp\` — JSON-RPC 2.0 over HTTP.

## Discovery
- Protected resource metadata: \`/.well-known/oauth-protected-resource\`
- Authorization server metadata: \`/.well-known/oauth-authorization-server\`
- MCP server card: \`/.well-known/mcp/server-card.json\`

## Auth flow (OAuth 2.1 + PKCE, public client)
1. Optionally register a client at \`POST /oauth/register\` (RFC 7591, public clients only).
2. Redirect the user to \`/oauth/authorize?...\` with PKCE \`code_challenge\` (S256).
3. After consent, redeem the \`code\` at \`POST /oauth/token\`.
4. Use the access token as a Bearer header on \`/api/mcp\` calls.
5. Tokens last 1h; rotate via the \`refresh_token\` grant.

## Initialize
Send an \`initialize\` JSON-RPC request with \`protocolVersion: 2025-06-18\`.
Then \`tools/list\` for the live tool schema.

## Capabilities
Server advertises \`tools.listChanged: false\`. No prompts or resources are exposed at this time.
`,
  },
]

// Use a distinct name to avoid colliding with the auto-imported sha256Hex
// in server/utils/oauth.ts.
export async function digestSkillBody(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}
