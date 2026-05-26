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

export function slaBorderClass(tier: SlaTier): string {
  switch (tier) {
    case 'overdue': return 'border-l-4 border-l-red-500'
    case 'aging':   return 'border-l-4 border-l-yellow-400'
    case 'fresh':   return 'border-l-4 border-l-transparent'
  }
}

export function slaBadgeClass(tier: SlaTier): string {
  switch (tier) {
    case 'overdue': return 'bg-red-50 text-red-700'
    case 'aging':   return 'bg-yellow-50 text-yellow-700'
    case 'fresh':   return 'bg-gray-50 text-gray-600'
  }
}

export function ageHours(date: string | Date | null | undefined): number | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  return Math.floor((Date.now() - d.getTime()) / HOUR_MS)
}
