// SEP-1649 — https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2127
import { getOrigin } from '../../../utils/oauth'

export default defineEventHandler((event) => {
  const origin = getOrigin(event)

  setHeader(event, 'content-type', 'application/json; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return {
    $schema: 'https://modelcontextprotocol.io/schemas/server-card/v0.1',
    serverInfo: {
      name: 'communityfix-mcp',
      version: '0.2.0',
      description:
        'CommunityFix MCP server — search, browse, and contribute issues, solutions, and case studies to the global community-driven catalog.',
      vendor: 'CommunityFix',
      homepage: origin,
      documentation: `${origin}/llms.txt`,
    },
    protocolVersion: '2025-06-18',
    transport: {
      type: 'http',
      endpoint: `${origin}/api/mcp`,
      methods: ['POST'],
      contentType: 'application/json',
    },
    capabilities: {
      tools: { listChanged: false },
    },
    auth: {
      type: 'oauth2',
      // Spec-aligned discovery; agents should fetch these for the live config.
      protectedResource: `${origin}/.well-known/oauth-protected-resource`,
      authorizationServer: `${origin}/.well-known/oauth-authorization-server`,
      scopesSupported: ['mcp'],
      dynamicClientRegistration: `${origin}/oauth/register`,
      revocationEndpoint: `${origin}/oauth/revoke`,
      grantTypesSupported: ['authorization_code', 'refresh_token'],
      pkce: { required: true, methods: ['S256'] },
      // RFC 8707: tokens are audience-bound to this resource.
      resource: `${origin}/api/mcp`,
      resourceIndicatorsSupported: true,
    },
    tools: [
      {
        name: 'search_issues_solutions',
        description: 'Semantic vector search across CommunityFix issues and solutions.',
      },
      { name: 'get_issue', description: 'Fetch a single issue or solution by id.' },
      { name: 'get_tree', description: 'Return the full descendant tree of an issue or solution.' },
      { name: 'create_issue', description: 'Create a new issue (top-level or sub-issue).' },
      { name: 'create_solution', description: 'Propose a solution for an existing issue.' },
      { name: 'update_issue', description: 'Edit an issue you authored.' },
      { name: 'update_solution', description: 'Edit a solution you authored.' },
      {
        name: 'create_case_study',
        description: 'Document a real-world implementation of a solution.',
      },
      { name: 'update_case_study', description: 'Edit a case study you authored.' },
      { name: 'get_case_study', description: 'Fetch a single case study by id.' },
      { name: 'list_case_studies', description: 'List case studies for a given solution.' },
      { name: 'suggest_more', description: 'Get semantically similar issues or solutions.' },
      { name: 'search_tags', description: 'Search the tag taxonomy by name or slug.' },
      { name: 'get_user', description: 'Fetch a public user profile.' },
      { name: 'whoami', description: 'Get the authenticated user profile.' },
      {
        name: 'get_whitepaper',
        description: 'Read the CommunityFix whitepaper (mission, principles, model).',
      },
      {
        name: 'get_guide',
        description: 'Read authoring guides for writing good issues, solutions, and case studies.',
      },
    ],
    contact: {
      name: 'CommunityFix',
      url: 'https://communityfix.org',
    },
  }
})
