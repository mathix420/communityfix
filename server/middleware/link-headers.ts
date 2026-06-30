const RAW_REPO_BASE = 'https://raw.githubusercontent.com/mathix420/communityfix/refs/heads/master'

const LINKS_FOR_ROOT = [
  '</.well-known/mcp/server-card.json>; rel="mcp-server-card"; type="application/json"',
  '</.well-known/oauth-protected-resource>; rel="oauth-protected-resource"; type="application/json"',
  '</llms.txt>; rel="alternate"; type="text/markdown"; title="LLM-friendly overview"',
  '</sitemap.xml>; rel="sitemap"; type="application/xml"',
  '</api/mcp>; rel="service-endpoint"; title="Model Context Protocol JSON-RPC"',
].join(', ')

const LINKS_FOR_API_MCP = [
  '</.well-known/mcp/server-card.json>; rel="mcp-server-card"; type="application/json"',
  '</.well-known/oauth-protected-resource>; rel="oauth-protected-resource"; type="application/json"',
  '</.well-known/oauth-authorization-server>; rel="oauth-authorization-server"; type="application/json"',
].join(', ')

function markdownAlternateFor(path: string): string | null {
  if (path === '/whitepaper' || path === '/privacy' || path === '/terms') {
    return `${RAW_REPO_BASE}/content${path}.md`
  }
  const guide = path.match(/^\/guide\/([^/]+)\/?$/)
  if (guide) return `${RAW_REPO_BASE}/content/guide/${guide[1]}.md`

  const issue = path.match(/^\/issue\/(\d+)\/?$/)
  if (issue) return `/issue/${issue[1]}.md`
  const cs = path.match(/^\/case-study\/(\d+)\/?$/)
  if (cs) return `/case-study/${cs[1]}.md`

  return null
}

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname

  if (path === '/' || path === '') {
    appendHeader(event, 'Link', LINKS_FOR_ROOT)
    return
  }
  if (path === '/api/mcp') {
    appendHeader(event, 'Link', LINKS_FOR_API_MCP)
    return
  }
  const md = markdownAlternateFor(path)
  if (md) {
    appendHeader(
      event,
      'Link',
      `<${md}>; rel="alternate"; type="text/markdown"; title="Markdown source"`,
    )
  }
})
