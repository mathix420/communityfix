// Content negotiation: if a GET request prefers text/markdown over HTML,
// serve a markdown rendering of the page instead of the default HTML
// (https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/).
// Returning a value short-circuits the rest of the Nitro chain — the
// Nuxt SSR renderer detects the already-written response and skips.
import { renderPathAsMarkdown } from '../utils/markdown-render'

function prefersMarkdown(accept: string): boolean {
  if (!accept) return false
  const lower = accept.toLowerCase()
  if (!lower.includes('text/markdown')) return false
  // Also accept if markdown comes before */* or text/html in the q-ranking.
  // For simplicity: if markdown is mentioned at all (typical agent header
  // is "text/markdown,*/*;q=0.5"), honour it.
  return true
}

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET') return
  const accept = getRequestHeader(event, 'accept') ?? ''
  if (!prefersMarkdown(accept)) return

  const path = getRequestURL(event).pathname
  // Never intercept API / well-known / auth routes — those have their
  // own content types and would be broken by a markdown override.
  if (path.startsWith('/api/') || path.startsWith('/.well-known/') || path.startsWith('/oauth/') || path.startsWith('/_')) return
  if (path.endsWith('.xml') || path.endsWith('.json') || path.endsWith('.txt') || path.endsWith('.md')) return

  let md: string | null
  try {
    md = await renderPathAsMarkdown(path, event)
  }
  catch (err) {
    console.error('[markdown-negotiation] render failed for', path, err)
    return
  }
  if (md === null) return

  setHeader(event, 'content-type', 'text/markdown; charset=utf-8')
  setHeader(event, 'vary', 'accept')
  setHeader(event, 'cache-control', 'public, max-age=60')
  return md
})
