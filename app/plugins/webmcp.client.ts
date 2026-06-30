// WebMCP — https://webmachinelearning.github.io/webmcp/
interface ModelContextTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  execute: (input: Record<string, unknown>) => Promise<unknown> | unknown
}

interface ModelContext {
  registerTool: (
    tool: ModelContextTool,
    options?: { exposedTo?: string | string[] },
  ) => { unregister: () => void } | void
}

declare global {
  interface Navigator {
    modelContext?: ModelContext
  }
}

export default defineNuxtPlugin(() => {
  if (import.meta.server) return
  const mc = navigator.modelContext
  if (!mc || typeof mc.registerTool !== 'function') return

  const router = useRouter()

  const tools: ModelContextTool[] = [
    {
      name: 'cf_search_issues',
      description:
        'Search CommunityFix for issues and solutions matching a natural-language query. Navigates the current tab to the search results page.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Natural-language search query.' },
          sort: {
            type: 'string',
            enum: ['newest', 'oldest', 'most_voted', 'trending'],
            default: 'trending',
          },
        },
        required: ['query'],
      },
      execute: async (input) => {
        const query = String(input.query ?? '').trim()
        const sort = typeof input.sort === 'string' ? input.sort : 'trending'
        if (!query) return { ok: false, error: 'query is required' }
        await router.push({ path: '/', query: { search: query, sort } })
        return {
          ok: true,
          url: `https://communityfix.org/?search=${encodeURIComponent(query)}&sort=${encodeURIComponent(sort)}`,
        }
      },
    },
    {
      name: 'cf_open_issue',
      description: 'Open a CommunityFix issue or solution by its numeric id.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'Issue or solution id.' },
        },
        required: ['id'],
      },
      execute: async (input) => {
        const id = Number(input.id)
        if (!Number.isInteger(id) || id <= 0)
          return { ok: false, error: 'id must be a positive integer' }
        await router.push(`/issue/${id}`)
        return { ok: true, url: `https://communityfix.org/issue/${id}` }
      },
    },
    {
      name: 'cf_open_case_study',
      description: 'Open a CommunityFix case study by its numeric id.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'integer', description: 'Case study id.' } },
        required: ['id'],
      },
      execute: async (input) => {
        const id = Number(input.id)
        if (!Number.isInteger(id) || id <= 0)
          return { ok: false, error: 'id must be a positive integer' }
        await router.push(`/case-study/${id}`)
        return { ok: true, url: `https://communityfix.org/case-study/${id}` }
      },
    },
    {
      name: 'cf_open_tag',
      description: 'Open the listing page for a CommunityFix tag by its slug.',
      inputSchema: {
        type: 'object',
        properties: { slug: { type: 'string', description: 'Tag slug, e.g. "housing".' } },
        required: ['slug'],
      },
      execute: async (input) => {
        const slug = String(input.slug ?? '').trim()
        if (!slug) return { ok: false, error: 'slug is required' }
        await router.push(`/tag/${encodeURIComponent(slug)}`)
        return { ok: true, url: `https://communityfix.org/tag/${encodeURIComponent(slug)}` }
      },
    },
    {
      name: 'cf_start_new_issue',
      description:
        'Open the new-issue composer. The user remains in control of submitting — this only prepares the form.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Optional title to pre-fill.' },
          summary: {
            type: 'string',
            description: 'Optional short plaintext summary to pre-fill (max 280 chars).',
          },
        },
      },
      execute: async (input) => {
        const query: Record<string, string> = {}
        if (typeof input.title === 'string' && input.title.trim()) query.title = input.title.trim()
        if (typeof input.summary === 'string' && input.summary.trim())
          query.summary = input.summary.trim().slice(0, 280)
        await router.push({ path: '/new', query })
        return { ok: true, url: 'https://communityfix.org/new' }
      },
    },
    {
      name: 'cf_discovery',
      description:
        'List CommunityFix discovery endpoints (MCP server card, llms.txt, sitemap, OAuth metadata) so the agent can switch to the structured API.',
      inputSchema: { type: 'object', properties: {} },
      execute: () => ({
        mcpEndpoint: 'https://communityfix.org/api/mcp',
        mcpServerCard: 'https://communityfix.org/.well-known/mcp/server-card.json',
        llmsTxt: 'https://communityfix.org/llms.txt',
        sitemap: 'https://communityfix.org/sitemap.xml',
        oauthProtectedResource: 'https://communityfix.org/.well-known/oauth-protected-resource',
        oauthAuthorizationServer: 'https://communityfix.org/.well-known/oauth-authorization-server',
      }),
    },
  ]

  for (const tool of tools) {
    try {
      mc.registerTool(tool)
    } catch (err) {
      console.warn('[webmcp] failed to register tool', tool.name, err)
    }
  }
})
