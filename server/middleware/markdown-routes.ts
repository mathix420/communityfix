// Middleware (not a file route) because Nitro's filesystem router treats
// `:id.md` as a single dynamic segment and would shadow the HTML page.
import { renderCaseStudyMarkdown, renderIssueMarkdown } from '../utils/markdown-node'

const CANONICAL_BASE = 'https://communityfix.org'

const ISSUE_RE = /^\/issue\/(\d+)\.md$/
const CASE_STUDY_RE = /^\/case-study\/(\d+)\.md$/

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET') return
  const path = getRequestURL(event).pathname

  const issue = path.match(ISSUE_RE)
  if (issue) {
    const id = parseInt(issue[1]!, 10)
    const md = await renderIssueMarkdown(id)
    if (!md) throw createError({ statusCode: 404, statusMessage: 'Issue not found' })
    setHeader(event, 'content-type', 'text/markdown; charset=utf-8')
    setHeader(event, 'cache-control', 'public, max-age=60')
    appendHeader(event, 'Link', `<${CANONICAL_BASE}/issue/${id}>; rel="canonical"`)
    return md
  }

  const cs = path.match(CASE_STUDY_RE)
  if (cs) {
    const id = parseInt(cs[1]!, 10)
    const md = await renderCaseStudyMarkdown(id)
    if (!md) throw createError({ statusCode: 404, statusMessage: 'Case study not found' })
    setHeader(event, 'content-type', 'text/markdown; charset=utf-8')
    setHeader(event, 'cache-control', 'public, max-age=60')
    appendHeader(event, 'Link', `<${CANONICAL_BASE}/case-study/${id}>; rel="canonical"`)
    return md
  }
})
