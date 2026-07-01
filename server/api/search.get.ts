import { searchCatalog } from '../utils/discovery'

// Natural-language semantic search across issues AND solutions — the discovery
// entry point for AI clients (e.g. a ChatGPT Custom GPT). A conversational
// question maps poorly onto the keyword full-text `search` of /api/issues, so
// this ranks by embedding similarity and covers solutions, not just top-level
// issues. Logic lives in searchCatalog (server/utils/discovery.ts).
export default defineEventHandler((event) => searchCatalog(getQuery(event)))
