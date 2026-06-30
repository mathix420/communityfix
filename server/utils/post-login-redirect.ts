import type { H3Event } from 'h3'

const POST_LOGIN_COOKIE = 'mcp_continue'

// Same-origin paths only (must start with "/" and not "//"), so the cookie
// can't be turned into an open redirector.
export function isSafePostLoginRedirect(url: unknown): url is string {
  return typeof url === 'string' && url.length > 0 && url.startsWith('/') && !url.startsWith('//')
}

export function setPostLoginRedirect(event: H3Event, url: string): void {
  if (!isSafePostLoginRedirect(url)) return
  setCookie(event, POST_LOGIN_COOKIE, url, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: !import.meta.dev,
    maxAge: 60 * 10,
  })
}

export function consumePostLoginRedirect(event: H3Event): string | null {
  const url = getCookie(event, POST_LOGIN_COOKIE)
  if (!url) return null
  deleteCookie(event, POST_LOGIN_COOKIE, { path: '/' })
  return isSafePostLoginRedirect(url) ? url : null
}
