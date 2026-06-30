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
        'Read-only access to the CommunityFix catalog — a public tree of issues (problems), solutions (proposed approaches, which are leaves), and case studies (real-world deployments of a solution). Use these endpoints to search, browse, and explain what the community has documented. All endpoints are anonymous and side-effect-free; nothing here creates or modifies data.',
      version: '1.0.0',
    },
    servers: [{ url: origin }],
    paths: {
      '/api/issues': {
        get: {
          operationId: 'listIssues',
          summary: 'List or full-text-search top-level issues',
          description:
            'Browse top-level issues (problems). Supports keyword full-text search, tag filtering, geographic radius filtering, and sorting. Excludes rejected issues. For natural-language / meaning-based matching (e.g. duplicate detection) prefer searchSimilarIssues.',
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
      '/api/issues/similar': {
        get: {
          operationId: 'searchSimilarIssues',
          summary: 'Semantic (vector) search for similar issues',
          description:
            'Given a candidate problem title and summary, return the most semantically similar existing top-level issues using vector embeddings. Use this to detect duplicates or surface related problems by meaning rather than keywords. Returns status "too_short" if title < 5 chars or summary < 10 chars, and "unavailable" if embeddings cannot be computed.',
          parameters: [
            {
              name: 'title',
              in: 'query',
              required: true,
              description: 'Candidate issue title (minimum 5 characters).',
              schema: { type: 'string' },
            },
            {
              name: 'summary',
              in: 'query',
              required: true,
              description: 'Candidate issue summary (minimum 10 characters).',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Semantic matches, ordered most-similar first.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SimilarResponse' },
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
          description: 'Return every tag (slug + display name) usable to filter issues.',
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
            'Return the catalog of UN Sustainable Development Goals that issues can be mapped to.',
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
      '/api/user/{id}': {
        get: {
          operationId: 'getUserProfile',
          summary: 'Get a public user profile by UUID',
          description:
            'Return a user’s public profile: name, headline, bio, trust score, qualifications with endorsement counts, and the issues, solutions, and case studies they have authored. The `id` is the UUID found on a node’s authorId field.',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'User UUID (the authorId of an issue/solution/case study).',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': {
              description: 'The public profile.',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/UserProfile' } },
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
            id: { type: 'integer' },
            name: { type: 'string' },
            iconUrl: { type: 'string' },
            link: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        SimilarResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok', 'unavailable', 'too_short'] },
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  title: { type: 'string' },
                  summary: { type: 'string' },
                  similarity: {
                    type: 'integer',
                    description: 'Cosine similarity as a 0–100 percentage.',
                  },
                },
              },
            },
          },
        },
        UserProfile: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            headline: { type: 'string' },
            bio: { type: 'string' },
            location: { type: 'string' },
            trustScore: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            qualifications: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  title: { type: 'string' },
                  area: { type: 'string' },
                  detail: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  endorsementCount: { type: 'integer' },
                  isVerified: { type: 'boolean' },
                  viewerHasEndorsed: { type: 'boolean' },
                },
              },
            },
            isAdmin: { type: 'boolean' },
            endorsementsReceived: { type: 'integer' },
            viewer: {
              type: 'object',
              description:
                'Flags about the requester relative to this profile (anonymous via this action).',
              properties: {
                isOwner: { type: 'boolean' },
                canEndorse: { type: 'boolean' },
                isAdmin: { type: 'boolean' },
                isAuthenticated: { type: 'boolean' },
              },
            },
            issues: { type: 'array', items: { $ref: '#/components/schemas/Node' } },
            solutions: { type: 'array', items: { $ref: '#/components/schemas/Node' } },
            caseStudies: { type: 'array', items: { $ref: '#/components/schemas/CaseStudy' } },
          },
        },
      },
    },
  }
})
