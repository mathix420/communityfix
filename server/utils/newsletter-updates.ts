// Product updates surfaced in the newsletter's "Product updates" block.
// Deliberately a code-side constant rather than a content collection:
// scheduled tasks have no h3 event or D1 access for `queryCollection`, and
// updates ship with deploys anyway. Add an entry here when a user-facing
// feature lands; entries older than the digest window simply stop appearing.
export interface ProductUpdate {
  /** UTC day the update shipped, YYYY-MM-DD. */
  date: string
  title: string
  blurb: string
  /** Absolute URL; defaults to the site root in the email when omitted. */
  url?: string
}

export const PRODUCT_UPDATES: ProductUpdate[] = [
  {
    date: '2026-07-13',
    title: 'Wanted skills on issues',
    blurb:
      'Issues can now list the skills they are missing. Add credentials to your profile and the newsletter will match you with issues that need them.',
    url: 'https://communityfix.org/contribute',
  },
  {
    date: '2026-07-13',
    title: 'A newsletter you compose yourself',
    blurb:
      'Pick exactly which blocks you want — success stories, skill matches, your interests, help wanted — and how often. This email is the result.',
    url: 'https://communityfix.org/settings',
  },
]
