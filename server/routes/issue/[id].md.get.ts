// Markdown rendering of one issue or solution for AI agents.
// `/issue/{id}.md` mirrors the canonical `/issue/{id}` HTML page.
import { renderIssueMarkdown } from '../../utils/markdown-node'

export default defineEventHandler(async (event) => {
  // Nitro filesystem routing parses `[id].md.get.ts` into a single param
  // literally named `id.md`, with the `.md` suffix included in the value.
  const params = event.context.params ?? {}
  const rawId = (params['id.md'] ?? '').replace(/\.md$/, '')
  const id = rawId ? parseInt(rawId, 10) : NaN
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid issue id' })
  }

  const md = await renderIssueMarkdown(id)
  if (!md) throw createError({ statusCode: 404, statusMessage: 'Issue not found' })

  setHeader(event, 'content-type', 'text/markdown; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=60')
  appendHeader(event, 'Link', `<https://communityfix.org/issue/${id}>; rel="canonical"`)
  return md
})
