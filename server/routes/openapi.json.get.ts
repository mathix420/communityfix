import { getOrigin } from '../utils/oauth'

// OpenAPI 3.1 schema describing the PUBLIC, read-only REST surface of
// CommunityFix. It exists so a ChatGPT Custom GPT (a "GPT Action") can call
// these endpoints — the GPT builder imports this document by URL.
//
// SCOPE: only anonymous, side-effect-free GET endpoints are listed. Writes,
// votes, admin routes, and anything behind requireUserSession are deliberately
// excluded — those need OAuth and belong to a separate, authenticated action.
// The MCP endpoint (/api/mcp) is JSON-RPC and is NOT describable here.
//
// `servers[0].url` is derived from the request origin so the same document is
// correct on production, staging, and local dev.
export default defineEventHandler((event) => {
  const origin = getOrigin(event)

  return {
    openapi: '3.1.0',
    info: {
      title: 'CommunityFix (read-only)',
      description:
        'Read-only access to the CommunityFix catalog — a public tree of issues (problems), solutions (proposed approaches, which are leaves), and case studies (real-world deployments of a solution). Built for discovery: start from searchCatalog for natural-language questions over issues and solutions, discoverCaseStudies for "what has actually worked", and listNearby for "what has been documented near a place". All endpoints are anonymous and side-effect-free; nothing here creates or modifies data.',
      version: '1.0.0',
    },
    servers: [{ url: origin }],
    paths: {
      '/api/issues': {
        get: {
          operationId: 'listIssues',
          summary: 'List or full-text-search top-level issues',
          description:
            'Browse top-level issues (problems). Supports keyword full-text search, tag filtering, geographic radius filtering, and sorting. Excludes rejected issues. For natural-language / meaning-based questions across both issues and solutions, prefer searchCatalog.',
          parameters: [
            {
              name: 'search',
              in: 'query',
              required: false,
              description:
                'Keyword full-text query matched against issue title, summary, and body.',
              schema: { type: 'string' },
            },
            {
              name: 'tag',
              in: 'query',
              required: false,
              description: 'Restrict to issues carrying this tag slug (see listTags).',
              schema: { type: 'string' },
            },
            {
              name: 'sort',
              in: 'query',
              required: false,
              description: 'Ordering of results.',
              schema: {
                type: 'string',
                enum: ['most_voted', 'trending', 'newest', 'oldest'],
                default: 'most_voted',
              },
            },
            {
              name: 'lat',
              in: 'query',
              required: false,
              description:
                'Latitude of a place of interest for radius filtering. Must be supplied together with lng and radius.',
              schema: { type: 'number' },
            },
            {
              name: 'lng',
              in: 'query',
              required: false,
              description:
                'Longitude of a place of interest for radius filtering. Must be supplied together with lat and radius.',
              schema: { type: 'number' },
            },
            {
              name: 'radius',
              in: 'query',
              required: false,
              description: 'Radius in kilometres around (lat, lng) to filter issues by location.',
              schema: { type: 'number' },
            },
          ],
          responses: {
            '200': {
              description: 'Matching top-level issues.',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { $ref: '#/components/schemas/Node' } },
                },
              },
            },
          },
        },
      },
      '/api/search': {
        get: {
          operationId: 'searchCatalog',
          summary: 'Semantic search across issues and solutions',
          description:
            'Natural-language vector search over BOTH issues (problems) and solutions (proposed approaches), ranked by meaning rather than keywords. This is the primary discovery entry point: pass a conversational question (e.g. "what can I do to make my city greener?") and get the most relevant nodes back. Prefer this over listIssues for free-text questions. Returns status "too_short" if the query is under 3 characters and "embeddings_unavailable" if the vector backend is down.',
          parameters: [
            {
              name: 'query',
              in: 'query',
              required: true,
              description: 'Natural-language search query (minimum 3 characters).',
              schema: { type: 'string' },
            },
            {
              name: 'type',
              in: 'query',
              required: false,
              description: 'Restrict results to one node kind, or "any" for both.',
              schema: { type: 'string', enum: ['issue', 'solution', 'any'], default: 'any' },
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              description: 'Maximum results to return (1–25).',
              schema: { type: 'integer', default: 10, minimum: 1, maximum: 25 },
            },
          ],
          responses: {
            '200': {
              description: 'Semantic matches, ordered most-relevant first.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SearchResponse' },
                },
              },
            },
          },
        },
      },
      '/api/nearby': {
        get: {
          operationId: 'listNearby',
          summary: 'Find issues, solutions and case studies near a place',
          description:
            'Geographic discovery: return approved issues, solutions, and case studies within `radius` kilometres of a point, merged into one list ordered nearest-first. Each item is tagged with its `kind` and the `distanceKm` from the query point. Use this for "what has been documented / tried near <place>" questions — geocode the place to lat/lng first.',
          parameters: [
            {
              name: 'lat',
              in: 'query',
              required: true,
              description: 'Latitude of the place of interest.',
              schema: { type: 'number' },
            },
            {
              name: 'lng',
              in: 'query',
              required: true,
              description: 'Longitude of the place of interest.',
              schema: { type: 'number' },
            },
            {
              name: 'radius',
              in: 'query',
              required: false,
              description: 'Search radius in kilometres (default 25, max 2000).',
              schema: { type: 'number', default: 25 },
            },
            {
              name: 'kind',
              in: 'query',
              required: false,
              description: 'Restrict to one kind, or "any" for all three.',
              schema: {
                type: 'string',
                enum: ['issue', 'solution', 'case-study', 'any'],
                default: 'any',
              },
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              description: 'Maximum results to return (1–50).',
              schema: { type: 'integer', default: 20, minimum: 1, maximum: 50 },
            },
          ],
          responses: {
            '200': {
              description: 'Nearby nodes and case studies, nearest first.',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { $ref: '#/components/schemas/NearbyItem' } },
                },
              },
            },
          },
        },
      },
      '/api/case-studies': {
        get: {
          operationId: 'discoverCaseStudies',
          summary: 'Search and filter case studies across the whole catalog',
          description:
            'Discover documented real-world deployments ("what has actually worked") across all solutions — not scoped to one node. Pass a natural-language `query` for semantic ranking (each result then carries `similarity`), and/or filter by `outcome`, `scale`, and `verified`. Without a query, results are verified-first then most recent. Only approved case studies are returned. To list case studies for one specific solution or issue use listCaseStudies instead.',
          parameters: [
            {
              name: 'query',
              in: 'query',
              required: false,
              description: 'Natural-language query for semantic ranking (minimum 3 characters).',
              schema: { type: 'string' },
            },
            {
              name: 'outcome',
              in: 'query',
              required: false,
              description: 'Filter by reported outcome.',
              schema: {
                type: 'string',
                enum: ['success', 'partial', 'failed', 'inconclusive', 'ongoing'],
              },
            },
            {
              name: 'scale',
              in: 'query',
              required: false,
              description: 'Filter by geographic scale of the deployment.',
              schema: {
                type: 'string',
                enum: ['neighborhood', 'city', 'region', 'national', 'global'],
              },
            },
            {
              name: 'verified',
              in: 'query',
              required: false,
              description: 'Restrict to (true) or exclude (false) admin-verified case studies.',
              schema: { type: 'boolean' },
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              description: 'Maximum results to return (1–25).',
              schema: { type: 'integer', default: 10, minimum: 1, maximum: 25 },
            },
          ],
          responses: {
            '200': {
              description: 'Matching case studies.',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { $ref: '#/components/schemas/CaseStudy' } },
                },
              },
            },
          },
        },
      },
      '/api/nodes': {
        get: {
          operationId: 'listNodes',
          summary: 'List issues and solutions by tag or SDG',
          description:
            'Browse issues and solutions (including sub-issues) filtered by a tag slug and/or a Sustainable Development Goal id. At least one of `tag` or `sdg` is required. Use listTags and listSdgs to resolve human names to a `tag` slug / `sdg` id first. When both filters are supplied they intersect. Only approved nodes are returned.',
          parameters: [
            {
              name: 'tag',
              in: 'query',
              required: false,
              description: 'Tag slug to filter by (see listTags).',
              schema: { type: 'string' },
            },
            {
              name: 'sdg',
              in: 'query',
              required: false,
              description: 'Sustainable Development Goal id to filter by (see listSdgs).',
              schema: { type: 'integer' },
            },
            {
              name: 'type',
              in: 'query',
              required: false,
              description: 'Restrict to one node kind, or omit for both.',
              schema: { type: 'string', enum: ['issue', 'solution'] },
            },
            {
              name: 'sort',
              in: 'query',
              required: false,
              description: 'Ordering of results.',
              schema: {
                type: 'string',
                enum: ['most_voted', 'trending', 'newest', 'oldest'],
                default: 'most_voted',
              },
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              description: 'Maximum results to return (1–50).',
              schema: { type: 'integer', default: 20, minimum: 1, maximum: 50 },
            },
          ],
          responses: {
            '200': {
              description: 'Matching issues and solutions.',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { $ref: '#/components/schemas/Node' } },
                },
              },
            },
          },
        },
      },
      '/api/issue/{id}': {
        get: {
          operationId: 'getNode',
          summary: 'Get one issue or solution by id',
          description:
            'Fetch a single node by numeric id. Issues (type "issue") and solutions (type "solution") share the same shape — inspect the `type` field. Returns null if the id does not exist or the node is hidden.',
          parameters: [{ $ref: '#/components/parameters/NodeId' }],
          responses: {
            '200': {
              description: 'The issue or solution, or null if not found.',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/Node' } },
              },
            },
          },
        },
      },
      '/api/issue/{id}/tree': {
        get: {
          operationId: 'getNodeTree',
          summary: 'Get the descendant tree of a node',
          description:
            'Return the full descendant tree rooted at the given issue/solution id: sub-issues and solutions recursively, with approved case studies attached as leaf rows under their parent solution (a case-study row carries `parentId` = the solution id and an `outcome`). Capped at depth 10, 20 children per parent, and 500 nodes total.',
          parameters: [{ $ref: '#/components/parameters/NodeId' }],
          responses: {
            '200': {
              description: 'Flat list of descendant nodes; reconstruct the tree via parentId.',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { $ref: '#/components/schemas/TreeNode' } },
                },
              },
            },
          },
        },
      },
      '/api/issue/{id}/solutions': {
        get: {
          operationId: 'listSolutions',
          summary: 'List proposed solutions for an issue',
          description: 'Return the proposed solutions whose parent is the given issue id.',
          parameters: [
            { $ref: '#/components/parameters/NodeId' },
            {
              name: 'sort',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                enum: ['trending', 'most_voted', 'newest', 'oldest'],
                default: 'trending',
              },
            },
            {
              name: 'search',
              in: 'query',
              required: false,
              description: 'Keyword full-text query within this issue’s solutions.',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Solutions addressing the issue.',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { $ref: '#/components/schemas/Node' } },
                },
              },
            },
          },
        },
      },
      '/api/issue/{id}/case-studies': {
        get: {
          operationId: 'listCaseStudies',
          summary: 'List case studies under a node',
          description:
            'Return approved case studies. Pass a solution id to get that solution’s own case studies; pass an issue id to aggregate case studies across all of its approved solution children. Ordered verified-first, then most recent.',
          parameters: [{ $ref: '#/components/parameters/NodeId' }],
          responses: {
            '200': {
              description: 'Approved case studies.',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { $ref: '#/components/schemas/CaseStudy' } },
                },
              },
            },
          },
        },
      },
      '/api/case-study/{id}': {
        get: {
          operationId: 'getCaseStudy',
          summary: 'Get one case study by id',
          description:
            'Fetch a single case study (one real-world deployment of a solution) by numeric id. Returns null if not found.',
          parameters: [{ $ref: '#/components/parameters/NodeId' }],
          responses: {
            '200': {
              description: 'The case study, or null if not found.',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/CaseStudy' } },
              },
            },
          },
        },
      },
      '/api/tags': {
        get: {
          operationId: 'listTags',
          summary: 'List all tags',
          description:
            'Return every tag (slug + display name). Use a tag `slug` with the `tag` filter on listNodes or listIssues.',
          responses: {
            '200': {
              description: 'All tags.',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { $ref: '#/components/schemas/Tag' } },
                },
              },
            },
          },
        },
      },
      '/api/sdgs': {
        get: {
          operationId: 'listSdgs',
          summary: 'List UN Sustainable Development Goals',
          description:
            'Return the catalog of UN Sustainable Development Goals nodes can be mapped to. Use an SDG `id` with the `sdg` filter on listNodes.',
          responses: {
            '200': {
              description: 'All SDGs.',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { $ref: '#/components/schemas/Sdg' } },
                },
              },
            },
          },
        },
      },
    },
    components: {
      parameters: {
        NodeId: {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Numeric node id.',
          schema: { type: 'integer' },
        },
      },
      schemas: {
        Location: {
          type: 'object',
          description:
            'A geographic point with an optional GeoJSON area. Null when no location is set.',
          properties: {
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            area: {
              description:
                'GeoJSON geometry of the affected area (the point above is its centroid), or null.',
            },
          },
        },
        Link: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            title: { type: 'string', description: 'Optional human label for the link.' },
          },
          required: ['url'],
        },
        SdgRef: {
          type: 'object',
          description: 'A Sustainable Development Goal a node is mapped to.',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            iconUrl: { type: 'string' },
            link: { type: 'string' },
          },
        },
        Node: {
          type: 'object',
          description:
            'An issue (problem) or solution (proposed approach). Distinguish via the `type` field.',
          properties: {
            id: { type: 'integer' },
            parentId: {
              type: 'integer',
              description: 'Parent node id; null for a top-level issue.',
            },
            title: { type: 'string' },
            summary: { type: 'string', description: 'Short plaintext snippet (≤280 chars).' },
            description: {
              type: 'string',
              description: 'Markdown long-form body; null when absent.',
            },
            authorId: {
              type: 'string',
              description: 'Author UUID; null if the author account was removed.',
            },
            author: { type: 'string', description: 'Author display name, or "Anonymous".' },
            date: { type: 'string', description: 'Creation date, YYYY-MM-DD.' },
            solutionCount: { type: 'integer' },
            subIssueCount: { type: 'integer' },
            voteScore: { type: 'integer' },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
            type: { type: 'string', enum: ['issue', 'solution'] },
            solutionStatus: {
              type: 'string',
              enum: ['plan', 'in-progress', 'done'],
              description: 'Lifecycle stage; set on solutions only, otherwise null.',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tag slugs attached to this node.',
            },
            sustainableDevelopmentGoals: {
              type: 'array',
              items: { $ref: '#/components/schemas/SdgRef' },
            },
            locationName: {
              type: 'string',
              description: 'Human-readable place name; null if none.',
            },
            location: { $ref: '#/components/schemas/Location' },
            scale: {
              type: 'string',
              enum: ['neighborhood', 'city', 'region', 'national', 'global'],
              description: 'Geographic scope of the node; null if unset.',
            },
            links: {
              type: 'array',
              items: { $ref: '#/components/schemas/Link' },
              description: 'External resources; null if none.',
            },
          },
        },
        TreeNode: {
          type: 'object',
          description:
            'A node within a descendant tree. Case-study rows have type "case-study", carry `parentId` = the solution id, and populate `outcome`.',
          properties: {
            id: { type: 'integer' },
            parentId: { type: 'integer' },
            title: { type: 'string' },
            type: { type: 'string', enum: ['issue', 'solution', 'case-study'] },
            solutionStatus: {
              type: 'string',
              enum: ['plan', 'in-progress', 'done'],
              description: 'Set on solution rows only, otherwise null.',
            },
            outcome: {
              type: 'string',
              enum: ['success', 'partial', 'failed', 'inconclusive', 'ongoing'],
              description: 'Set on case-study rows only, otherwise null.',
            },
            voteScore: { type: 'integer' },
            solutionCount: { type: 'integer' },
            subIssueCount: { type: 'integer' },
            author: { type: 'string' },
            depth: {
              type: 'integer',
              description: 'Depth below the requested root (root children = 1).',
            },
          },
        },
        CaseStudy: {
          type: 'object',
          description: 'One documented real-world implementation of a solution.',
          properties: {
            id: { type: 'integer' },
            solutionId: {
              type: 'integer',
              description: 'Id of the solution this case study implements.',
            },
            solutionTitle: {
              type: 'string',
              description: 'Parent solution title; null if not loaded.',
            },
            authorId: { type: 'string' },
            author: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
            rejectionReason: { type: 'string' },
            outcome: {
              type: 'string',
              enum: ['success', 'partial', 'failed', 'inconclusive', 'ongoing'],
            },
            scale: {
              type: 'string',
              enum: ['neighborhood', 'city', 'region', 'national', 'global'],
            },
            locationName: { type: 'string' },
            location: { $ref: '#/components/schemas/Location' },
            verified: { type: 'boolean', description: 'Admin-set: independently verified.' },
            description: { type: 'string' },
            implementer: { type: 'string', description: 'Who carried out the deployment.' },
            startDate: { type: 'string', description: 'YYYY-MM-DD; null if unknown.' },
            endDate: { type: 'string', description: 'YYYY-MM-DD; null if unknown/ongoing.' },
            metrics: {
              type: 'array',
              description: 'Quantitative outcomes.',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  baseline: { type: 'string' },
                  result: { type: 'string' },
                  unit: { type: 'string' },
                },
              },
            },
            cost: { type: 'string', description: 'Numeric cost as a string; null if unknown.' },
            currency: { type: 'string' },
            fundingSource: { type: 'string' },
            sources: {
              type: 'array',
              description: 'Citations backing the claims.',
              items: { $ref: '#/components/schemas/Link' },
            },
            lessonsLearned: { type: 'array', items: { type: 'string' } },
            links: {
              type: 'array',
              description: 'External resources documenting the deployment.',
              items: { $ref: '#/components/schemas/Link' },
            },
            similarity: {
              type: 'integer',
              description:
                'Cosine similarity as a 0–100 percentage. Present only on semantic discoverCaseStudies results.',
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Tag: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            slug: { type: 'string', description: 'Stable identifier used by the `tag` filter.' },
            name: { type: 'string', description: 'Display name.' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Sdg: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Stable identifier used by the `sdg` filter.' },
            name: { type: 'string' },
            iconUrl: { type: 'string' },
            link: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        SearchResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['ok', 'too_short', 'embeddings_unavailable'],
            },
            results: {
              type: 'array',
              description:
                'Matching nodes, each with a similarity score; empty unless status is "ok".',
              items: {
                allOf: [
                  { $ref: '#/components/schemas/Node' },
                  {
                    type: 'object',
                    properties: {
                      similarity: {
                        type: 'integer',
                        description: 'Cosine similarity as a 0–100 percentage.',
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        NearbyItem: {
          type: 'object',
          description:
            'One catalog entry near the query point. Inspect `kind`; `item` is a Node for issues/solutions or a CaseStudy for case studies.',
          properties: {
            kind: { type: 'string', enum: ['issue', 'solution', 'case-study'] },
            distanceKm: {
              type: 'number',
              description: 'Distance from the query point in kilometres (rounded to 1 decimal).',
            },
            item: {
              oneOf: [
                { $ref: '#/components/schemas/Node' },
                { $ref: '#/components/schemas/CaseStudy' },
              ],
            },
          },
        },
      },
    },
  }
})
