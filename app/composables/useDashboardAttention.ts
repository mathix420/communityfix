const SEEN_KEY = 'cf:dashboard-seen'

/**
 * Drives the blue "something's waiting" dot next to the header name and clears
 * it once the user has visited the dashboard.
 *
 * "Worth a visit" = the latest dashboard-relevant event is newer than the last
 * time this user opened /dashboard. Events are: a new proposal awaiting their
 * review (its `createdAt`) or a decision on one of their own proposals (its
 * `decidedAt`). The last-seen timestamp is shared via `useState` so visiting the
 * dashboard clears the header dot reactively, and persisted to localStorage so
 * it survives reloads.
 */
export function useDashboardAttention() {
  const { toReview, mine } = usePendingRevisions()
  const seenAt = useState<number>('cf-dashboard-seen', () => 0)

  // Gate on client mount: the seen timestamp only exists in localStorage, so
  // before hydration we can't know it — never flash the dot during SSR.
  const mounted = ref(false)
  onMounted(() => {
    mounted.value = true
    const raw = localStorage.getItem(SEEN_KEY)
    const stored = raw ? Number(raw) || 0 : 0
    if (stored > seenAt.value) seenAt.value = stored
  })

  const latestEventAt = computed(() => {
    let latest = 0
    for (const e of toReview.value) {
      const t = e.createdAt ? Date.parse(e.createdAt) : 0
      if (t > latest) latest = t
    }
    for (const e of mine.value) {
      const t = e.decidedAt ? Date.parse(e.decidedAt) : 0
      if (t > latest) latest = t
    }
    return latest
  })

  const hasAttention = computed(() => mounted.value && latestEventAt.value > seenAt.value)

  function markSeen() {
    const now = Date.now()
    if (now > seenAt.value) seenAt.value = now
    if (import.meta.client) localStorage.setItem(SEEN_KEY, String(seenAt.value))
  }

  return { hasAttention, markSeen }
}
