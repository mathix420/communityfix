// Trim a repeatable url/title input group (issue solution links, case-study
// sources) down to what the API accepts: whitespace stripped, blank titles
// collapsed to undefined, and rows without a url dropped entirely.
export function cleanLinkRows<T extends { url: string; title: string }>(
  rows: T[],
): Array<{ url: string; title?: string }> {
  return rows
    .map((r) => ({ url: r.url.trim(), title: r.title.trim() || undefined }))
    .filter((r) => r.url)
}
