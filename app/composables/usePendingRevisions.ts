import type { SerializedRevision } from '../../server/utils/revision-write'

// A revision row plus the small node descriptor the inbox endpoint attaches so
// the UI can link/label without a second fetch. Mirrors `InboxEntry` in
// `server/api/revisions/inbox.get.ts`.
export interface InboxEntry extends SerializedRevision {
  node: {
    targetKind: 'issue' | 'case_study'
    issueId: number | null
    caseStudyId: number | null
    label: string
  }
}

export interface RevisionInbox {
  toReview: InboxEntry[]
  mine: InboxEntry[]
  isAdmin: boolean
}

/**
 * Shared singleton for the current user's revision inbox, powering both the
 * header attention dot and the `/dashboard` page off a single fetch.
 *
 * SSR-safe: backed by `useFetch` keyed on `revision-inbox`, so the header and
 * the page dedupe onto one request. A no-op when logged out — the fetcher
 * short-circuits to an empty inbox and never calls the API.
 */
export function usePendingRevisions() {
  const { loggedIn } = useUserSession()

  const empty: RevisionInbox = { toReview: [], mine: [], isAdmin: false }

  const { data, pending, refresh } = useFetch<RevisionInbox>('/api/revisions/inbox', {
    key: 'revision-inbox',
    // Don't hit the endpoint for anonymous visitors — it would 401.
    immediate: loggedIn.value,
    default: () => empty,
    // Re-run when the auth state flips (login/logout) so the badge stays live.
    watch: [loggedIn],
  })

  // Number of proposals awaiting this user's decision — the header badge count.
  const count = computed(() => (loggedIn.value ? data.value?.toReview.length ?? 0 : 0))
  const toReview = computed(() => (loggedIn.value ? data.value?.toReview ?? [] : []))
  const mine = computed(() => (loggedIn.value ? data.value?.mine ?? [] : []))
  const isAdmin = computed(() => (loggedIn.value ? data.value?.isAdmin ?? false : false))

  return { data, count, toReview, mine, isAdmin, pending, refresh }
}
