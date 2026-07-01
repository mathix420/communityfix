import { discoverCaseStudies } from '../utils/discovery'

// Global case-study discovery — "what has actually worked, and where?". Searches
// approved case studies across the whole catalog: optional semantic `query`,
// plus `outcome` / `scale` / `verified` filters. Logic lives in
// discoverCaseStudies (server/utils/discovery.ts).
export default defineEventHandler((event) => discoverCaseStudies(getQuery(event)))
