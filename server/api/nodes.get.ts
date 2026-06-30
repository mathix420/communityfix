import { listNodesByTaxonomy } from '../utils/discovery'

// Browse issues AND solutions by taxonomy — "show me everything tagged X" or
// "everything mapped to SDG N". Covers both node kinds (and sub-issues) and adds
// SDG filtering on top of what /api/issues offers. At least one of `tag` or
// `sdg` is required. Logic lives in listNodesByTaxonomy (server/utils/discovery.ts).
export default defineEventHandler((event) => listNodesByTaxonomy(getQuery(event)))
