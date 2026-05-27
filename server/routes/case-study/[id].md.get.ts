// Markdown rendering of one case study for AI agents.
// `/case-study/{id}.md` mirrors the canonical `/case-study/{id}` HTML page.
import { renderCaseStudyMarkdown } from '../../utils/markdown-node'

export default defineEventHandler(async (event) => {
  // See note in routes/issue/[id].md.get.ts about Nitro's param naming.
  const params = event.context.params ?? {}
  const rawId = (params['id.md'] ?? '').replace(/\.md$/, '')
  const id = rawId ? parseInt(rawId, 10) : NaN
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid case-study id' })
  }

  const md = await renderCaseStudyMarkdown(id)
  if (!md) throw createError({ statusCode: 404, statusMessage: 'Case study not found' })

  setHeader(event, 'content-type', 'text/markdown; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=60')
  appendHeader(event, 'Link', `<https://communityfix.org/case-study/${id}>; rel="canonical"`)
  return md
})
