// RFC 9727 — API Catalog as an RFC 9264 linkset.
// Lists the JSON-RPC MCP endpoint and its supporting metadata so agents
// can discover the API surface without scraping the homepage.
import { getOrigin } from '../../utils/oauth'

export default defineEventHandler((event) => {
  const origin = getOrigin(event)

  setHeader(event, 'content-type', 'application/linkset+json')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return {
    linkset: [
      {
        anchor: `${origin}/api/mcp`,
        'service-doc': [
          {
            href: `${origin}/llms.txt`,
            type: 'text/markdown',
            title: 'CommunityFix LLM-friendly overview',
          },
        ],
        'service-desc': [
          {
            href: `${origin}/.well-known/mcp/server-card.json`,
            type: 'application/json',
            title: 'MCP server card (SEP-1649)',
          },
        ],
        'oauth-protected-resource': [
          {
            href: `${origin}/.well-known/oauth-protected-resource`,
            type: 'application/json',
            title: 'OAuth Protected Resource Metadata (RFC 9728)',
          },
        ],
        'oauth-authorization-server': [
          {
            href: `${origin}/.well-known/oauth-authorization-server`,
            type: 'application/json',
            title: 'OAuth Authorization Server Metadata (RFC 8414)',
          },
        ],
        author: [
          {
            href: 'https://communityfix.org',
            title: 'CommunityFix',
          },
        ],
      },
    ],
  }
})
