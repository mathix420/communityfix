import { searchByQuery } from '../utils/mcp-tools'
import type { IssueType } from '../database/schema'

// Natural-language semantic search across issues AND solutions.
//
// This is the discovery entry point for AI clients (e.g. a ChatGPT Custom GPT):
// a conversational question like "what can I do to make my city greener?" maps
// poorly onto the keyword full-text `search` of /api/issues, so this endpoint
// ranks by embedding similarity instead and — crucially — covers solutions, not
// just top-level issues. Backed by the same vector search the MCP
// `search_issues_solutions` tool uses.
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const query = (q.query as string) || ''
  const rawType = (q.type as string) || 'any'
  const type: IssueType | 'any' = rawType === 'issue' || rawType === 'solution' ? rawType : 'any'
  const limit = q.limit != null ? parseInt(q.limit as string, 10) : undefined

  return searchByQuery({ query, type, limit: Number.isNaN(limit!) ? undefined : limit })
})
