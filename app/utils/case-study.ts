// Single source of truth for how a case study's `outcome` and `scale` render as
// badges. Previously copy-pasted into the case-study page, the case-study card,
// the tree node, and the issue overview — keep it here so the label/variant
// mapping only ever has to change in one place.
type BadgeVariant = 'success' | 'default' | 'error' | 'warning'

const OUTCOME_VARIANT: Record<string, BadgeVariant> = {
  success: 'success',
  partial: 'default',
  failed: 'error',
  inconclusive: 'default',
  ongoing: 'warning',
}
const OUTCOME_LABEL: Record<string, string> = {
  success: 'Success',
  partial: 'Partial',
  failed: 'Failed',
  inconclusive: 'Inconclusive',
  ongoing: 'Ongoing',
}
const SCALE_LABEL: Record<string, string> = {
  neighborhood: 'Neighborhood',
  city: 'City',
  region: 'Region',
  national: 'National',
  global: 'Global',
}

export function outcomeBadgeVariant(outcome?: string | null): BadgeVariant {
  return (outcome && OUTCOME_VARIANT[outcome]) || 'default'
}
export function outcomeBadgeLabel(outcome?: string | null): string {
  return (outcome && (OUTCOME_LABEL[outcome] ?? outcome)) || ''
}
export function scaleBadgeLabel(scale?: string | null): string {
  return (scale && (SCALE_LABEL[scale] ?? scale)) || ''
}
