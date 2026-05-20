import type { H3Event } from 'h3'

const POST_LOGIN_COOKIE = 'mcp_continue'

// Scoped to /oauth/ paths so this cookie can't be turned into an open redirector.
export function consumePostLoginRedirect(event: H3Event): string | null {
  const url = getCookie(event, POST_LOGIN_COOKIE)
  if (!url) return null
  deleteCookie(event, POST_LOGIN_COOKIE, { path: '/' })
  return url.startsWith('/oauth/') ? url : null
}
