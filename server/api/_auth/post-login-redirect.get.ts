const POST_LOGIN_COOKIE = 'mcp_continue'

// Called by AuthForm after a passkey login. Returns only same-origin /oauth/
// paths so the cookie can't be abused as an open redirector.
export default defineEventHandler((event) => {
  const url = getCookie(event, POST_LOGIN_COOKIE) ?? ''
  if (url) deleteCookie(event, POST_LOGIN_COOKIE, { path: '/' })
  return { url: url.startsWith('/oauth/') ? url : '' }
})
