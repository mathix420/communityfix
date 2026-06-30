import { findNearby } from '../utils/discovery'

// Geographic discovery — "what has the community documented near this place?".
// Returns approved issues, solutions, AND case studies within `radius` km of a
// point, merged nearest-first; each item carries its `kind` and `distanceKm`.
// Logic lives in findNearby (server/utils/discovery.ts).
export default defineEventHandler((event) => findNearby(getQuery(event)))
