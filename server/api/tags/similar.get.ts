// Closest catalog tags to a free-text query, by embedding similarity. Powers
// the live "targets these topics" preview when a user types an interest.
// Logged-in only: every call costs an OpenAI embedding, so keep the abuse
// surface small. Reuses the same search logic as the MCP `search_tags` tool.
import { searchTags } from '../../utils/mcp-tools'

const MIN_QUERY = 3
const LIMIT = 5

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const q = String(getQuery(event).q ?? '').trim()
  if (q.length < MIN_QUERY) {
    throw createError({
      statusCode: 400,
      statusMessage: `Query must be at least ${MIN_QUERY} characters`,
    })
  }

  const { results } = await searchTags({ query: q, limit: LIMIT })
  return results.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    similarity: 'similarity' in t ? t.similarity : null,
  }))
})
