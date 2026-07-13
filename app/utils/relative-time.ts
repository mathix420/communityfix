// Human-friendly "time ago" label shared across admin queue cards, the
// dashboard activity feed, revision timelines, and user profiles. Compact
// call sites (e.g. the dashboard feed) pass `suffix: ''` to render "5m"
// instead of "5m ago"; everything else keeps the default " ago".
export function formatRelative(
  date: string | null | undefined,
  { suffix = ' ago' }: { suffix?: string } = {},
): string {
  if (!date) return ''
  const d = new Date(date)
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m${suffix}`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h${suffix}`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 30) return `${diffD}d${suffix}`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
