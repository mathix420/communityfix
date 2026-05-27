// Advertise machine-discoverable resources via Link response headers (RFC
// 8288) — the MCP server card, llms.txt, sitemap, and OAuth metadata.
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

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (path === '/' || path === '') {
    appendHeader(event, 'Link', LINKS_FOR_ROOT)
    return
  }
  if (path === '/api/mcp') {
    appendHeader(event, 'Link', LINKS_FOR_API_MCP)
  }
})
