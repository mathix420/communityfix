import { listNodesNeedingHelp } from '../utils/discovery'

// Nodes the moderation pipeline flagged as needing contribution (help-wanted
// labels). Backs the /contribute view. Query params: `label` (one help label,
// omit for any), `kind` (issue | solution | case_study | any), `limit`. Returns
// the matching issues/solutions and case studies plus per-label facet counts.
// Logic lives in listNodesNeedingHelp (server/utils/discovery.ts).
export default defineEventHandler((event) => listNodesNeedingHelp(getQuery(event)))
