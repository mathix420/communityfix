// Deterministic "help wanted" labelling. Given a node's structured fields, work
// out which evidence/quality gaps it has. Pure and LLM-free: the moderation
// pipeline runs this after enrichment (curate + location resolution) has settled
// the text and location, then persists the result on `help_labels`.
//
// Labels are NOT rendered on the node itself. They power the contribute view,
// where users filter by label to find nodes worth improving.
import type {
  HelpLabel,
  IssueType,
  CaseStudyOutcome,
  LocationScale,
} from '../../../server/database/schema'

// A citation is worth counting only if it actually links somewhere.
type Linkish = { url?: string | null } | null | undefined
function hasLinks(arr: Linkish[] | null | undefined): boolean {
  return (
    Array.isArray(arr) &&
    arr.some((l) => !!l && typeof l.url === 'string' && l.url.trim().length > 0)
  )
}

// Markdown inline link or a bare URL inside a description body.
const INLINE_CITATION = /\]\((https?:\/\/[^)]+)\)|https?:\/\/\S+/i
// A quantitative claim: a number joined to a unit, percentage, currency, or
// magnitude word. Presence of one of these with no citation is what makes a node
// "needs-sources" — an unsourced statistic reads as an assertion, not evidence.
const QUANT_CLAIM =
  /\d[\d,.]*\s?(%|percent|pp|per cent|million|billion|thousand|tonnes?|tons?|kg|km|ha|hectares?|deaths?|injur|cases?|USD|EUR|GBP|\$|€|£|R\d)/i

export interface IssueNodeFields {
  type: IssueType
  description: string | null
  scale: LocationScale | null
  location: unknown | null
  links: Array<{ url: string; title?: string }> | null
}

export interface CaseStudyNodeFields {
  outcome: CaseStudyOutcome
  description: string | null
  metrics: Array<{ label: string; baseline?: string; result?: string; unit?: string }> | null
  sources: Array<{ url: string; title?: string }> | null
  cost: string | number | null
}

const nonEmpty = (s: string | null | undefined) => !!s && s.trim().length > 0

// Scales that describe a bounded place and therefore benefit from a point. A
// `global` node legitimately has no coordinate, so it is never asked for one.
const LOCATABLE_SCALES: LocationScale[] = ['neighborhood', 'city', 'region', 'national']

export function computeIssueHelpLabels(node: IssueNodeFields): HelpLabel[] {
  const labels: HelpLabel[] = []
  const desc = node.description ?? ''

  // needs-sources: the body makes a quantitative claim but cites nothing (neither
  // an inline link nor, for solutions, a `links` entry). Issues have no links
  // field, so they rely entirely on inline citation.
  if (QUANT_CLAIM.test(desc) && !INLINE_CITATION.test(desc) && !hasLinks(node.links)) {
    labels.push('needs-sources')
  }

  // needs-location: a bounded-scale node with no resolved coordinate. Checked
  // after the pipeline's location-resolution pass, so this only fires when
  // resolution genuinely found nothing.
  if (node.scale && LOCATABLE_SCALES.includes(node.scale) && node.location == null) {
    labels.push('needs-location')
  }

  return labels
}

export function computeCaseStudyHelpLabels(node: CaseStudyNodeFields): HelpLabel[] {
  const labels: HelpLabel[] = []
  const metrics = Array.isArray(node.metrics) ? node.metrics : []
  const hasMetrics = metrics.length > 0
  const claimsOutcome =
    node.outcome === 'success' || node.outcome === 'partial' || node.outcome === 'failed'

  // needs-evidence: a study asserting a concrete outcome with no metrics at all.
  // ongoing / inconclusive are exempt — interim or unresolved studies may not
  // have numbers yet.
  if (claimsOutcome && !hasMetrics) labels.push('needs-evidence')

  // needs-baseline: metrics exist but none carry a before/baseline value, so the
  // reader cannot see the change the intervention produced.
  if (hasMetrics && !metrics.some((m) => nonEmpty(m.baseline))) labels.push('needs-baseline')

  // needs-sources: no citations backing the claims.
  if (!hasLinks(node.sources)) labels.push('needs-sources')

  // needs-cost: no cost recorded, so reproducibility-by-budget can't be judged.
  if (node.cost == null || String(node.cost).trim().length === 0) labels.push('needs-cost')

  return labels
}
