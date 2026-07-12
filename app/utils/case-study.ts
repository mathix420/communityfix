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

function formatDay(s?: string | null): string | null {
  if (!s) return null
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function joinDates(s: string, e: string): string {
  return s === e ? s : `${s} – ${e}`
}

// "Since …" / "Until …" / "… – …" phrasing for a case study's start/end dates.
// Shared by the detail page and the card so both read identically.
export function caseStudyDateRange(start?: string | null, end?: string | null): string | null {
  const s = formatDay(start)
  const e = formatDay(end)
  if (!s) return e ? `Until ${e}` : null
  if (!e) return `Since ${s}`
  return joinDates(s, e)
}

// Try to render `num` as a localized currency; null if `cur` isn't a valid
// 3-letter code (or Intl rejects it), so the caller can fall back to plain.
function tryCurrency(num: number, cur: string): string | null {
  if (!/^[A-Za-z]{3}$/.test(cur)) return null
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: cur.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(num)
  } catch {
    return null
  }
}

// A grouped number, tagged with `cur` when it isn't a currency Intl understands.
function plainCost(num: number, cur: string): string {
  const formatted = new Intl.NumberFormat('en').format(num)
  return cur ? `${formatted} ${cur}` : formatted
}

function formatCost(num: number, currency?: string | null): string {
  const cur = (currency ?? '').trim()
  return tryCurrency(num, cur) ?? plainCost(num, cur)
}

// Human cost string for a case study: localized currency when possible, else a
// grouped number with the raw currency suffix. Shared by the detail page + card.
export function caseStudyCost(
  cost?: string | number | null,
  currency?: string | null,
): string | null {
  if (cost == null) return null
  const num = Number(cost)
  if (!Number.isFinite(num)) return String(cost)
  return formatCost(num, currency)
}
