// Dynamic robots.txt — references the sitemap and declares AI content
// preferences via the Content-Signal extension (contentsignals.org).
import { getOrigin } from '../utils/oauth'

export default defineEventHandler((event) => {
  const origin = getOrigin(event)
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  // Content-Signal preferences (draft-romm-aipref-contentsignals):
  // - search=yes    : indexing for traditional / agentic search is allowed
  // - ai-input=yes  : real-time citation in AI answers is allowed
  // - ai-train=no   : do not use this content to train generative models
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
