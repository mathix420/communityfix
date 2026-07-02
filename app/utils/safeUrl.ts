// Returns the URL only when it uses a safe scheme, otherwise '#'. Guards against
// javascript:/data:/vbscript: URLs slipping into an <a :href> binding — Vue
// escapes attribute *values* but does not validate URL schemes. User link/source
// URLs are also scheme-validated server-side on write (see sanitizeLinks); this
// is defense in depth and also neutralizes any link stored before that gate.
const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:'])

export function safeUrl(url: string | null | undefined): string {
  if (!url) return '#'
  try {
    return SAFE_SCHEMES.has(new URL(url).protocol) ? url : '#'
  } catch {
    return '#'
  }
}
