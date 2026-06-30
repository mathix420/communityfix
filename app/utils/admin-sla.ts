// Translate a created-at / appealed-at / responded-at timestamp into an SLA
// urgency tier and matching Tailwind classes. Centralized so every queue
// card stays consistent.
export type SlaTier = 'fresh' | 'aging' | 'overdue'

const HOUR_MS = 60 * 60 * 1000

export function slaTier(date: string | Date | null | undefined): SlaTier {
  if (!date) return 'fresh'
  const d = typeof date === 'string' ? new Date(date) : date
  const hours = (Date.now() - d.getTime()) / HOUR_MS
  if (hours >= 72) return 'overdue'
  if (hours >= 24) return 'aging'
  return 'fresh'
}

export function slaBorderClass(_tier: SlaTier): string {
  // Card accent intentionally dropped — the SlaBadge already signals urgency,
  // and the colored left border made the moderation queue visually noisier
  // than the rest of the site (which sticks to primary + gray + semantic red).
  return ''
}

export function slaBadgeClass(tier: SlaTier): string {
  switch (tier) {
    case 'overdue':
      return 'bg-red-50 text-red-700'
    case 'aging':
      return 'bg-gray-100 text-gray-700'
    case 'fresh':
      return 'bg-gray-50 text-gray-600'
  }
}

export function ageHours(date: string | Date | null | undefined): number | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  return Math.floor((Date.now() - d.getTime()) / HOUR_MS)
}
