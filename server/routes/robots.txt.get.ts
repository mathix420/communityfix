import { getOrigin } from '../utils/oauth'

export default defineEventHandler((event) => {
  const origin = getOrigin(event)
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return `# CommunityFix robots.txt

User-Agent: *
Disallow: /admin
Disallow: /api/
Disallow: /oauth/
Disallow: /settings
Disallow: /login
Disallow: /register
Disallow: /new
Disallow: /new-case-study
Allow: /api/mcp

Content-Signal: search=yes, ai-input=yes, ai-train=no

Sitemap: ${origin}/sitemap.xml
`
})
