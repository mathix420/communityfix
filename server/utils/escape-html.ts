/**
 * Escape a user-supplied string for interpolation into an HTML document or
 * email body. Anything that originates from a request body or a user-editable
 * field (names, titles, notes) must pass through this before landing in HTML.
 */
export function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )
}
