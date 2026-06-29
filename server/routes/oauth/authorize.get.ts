import { getClient, issueConsentToken, mcpResource, OAUTH_SCOPE } from '../../utils/oauth'

const POST_LOGIN_COOKIE = 'mcp_continue'

function redirectError(redirectUri: string, state: string | undefined, code: string, description: string) {
  const u = new URL(redirectUri)
  u.searchParams.set('error', code)
  u.searchParams.set('error_description', description)
  if (state) u.searchParams.set('state', state)
  return u.toString()
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]!))
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const clientId = typeof q.client_id === 'string' ? q.client_id : ''
  const redirectUri = typeof q.redirect_uri === 'string' ? q.redirect_uri : ''
  const responseType = typeof q.response_type === 'string' ? q.response_type : ''
  const codeChallenge = typeof q.code_challenge === 'string' ? q.code_challenge : ''
  const codeChallengeMethod = typeof q.code_challenge_method === 'string' ? q.code_challenge_method : 'S256'
  const state = typeof q.state === 'string' ? q.state : undefined
  const scope = typeof q.scope === 'string' ? q.scope : OAUTH_SCOPE
  // RFC 8707: bind the grant to the requested resource, defaulting to our own
  // MCP endpoint so issued tokens are always audience-restricted.
  const resource = typeof q.resource === 'string' && q.resource ? q.resource : mcpResource(event)

  // RFC 6749 §4.1.2.1: only redirect errors to a verified URI. Before that,
  // surface failures as plain 400s.
  if (!clientId) throw createError({ statusCode: 400, statusMessage: 'client_id is required' })
  const client = await getClient(clientId)
  if (!client) throw createError({ statusCode: 400, statusMessage: 'Unknown client_id' })
  if (!redirectUri || !client.redirectUris.includes(redirectUri)) {
    throw createError({ statusCode: 400, statusMessage: 'redirect_uri does not match a registered URI' })
  }

  if (responseType !== 'code') {
    return sendRedirect(event, redirectError(redirectUri, state, 'unsupported_response_type', 'Only response_type=code is supported'))
  }
  if (!codeChallenge) {
    return sendRedirect(event, redirectError(redirectUri, state, 'invalid_request', 'PKCE code_challenge is required'))
  }
  if (codeChallengeMethod !== 'S256') {
    return sendRedirect(event, redirectError(redirectUri, state, 'invalid_request', 'code_challenge_method must be S256'))
  }

  const session = await getUserSession(event)
  if (!session.user) {
    // Stashed for the auth handlers (google/apple/passkey) to resume the flow post-login.
    const url = getRequestURL(event)
    setCookie(event, POST_LOGIN_COOKIE, url.pathname + url.search, {
      httpOnly: true,
      sameSite: 'lax',
      secure: url.protocol === 'https:',
      path: '/',
      maxAge: 600,
    })
    return sendRedirect(event, '/login')
  }

  const csrf = await issueConsentToken({ userId: session.user.id, clientId, redirectUri })

  setHeader(event, 'content-type', 'text/html; charset=utf-8')
  setHeader(event, 'cache-control', 'no-store')
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Authorize ${escapeHtml(client.name)} — CommunityFix</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: -apple-system, system-ui, sans-serif; background: #f7f7f8; margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 1.5rem; }
    .card { background: white; border-radius: 14px; padding: 2rem; max-width: 28rem; width: 100%; box-shadow: 0 8px 32px rgba(0,0,0,0.06); border: 1px solid #ececef; }
    h1 { margin: 0 0 .5rem; font-size: 1.25rem; }
    p { color: #555; line-height: 1.5; }
    .who { font-size: .85rem; color: #777; margin-top: 1.5rem; }
    .scopes { background: #f4f4f6; border-radius: 8px; padding: 1rem; margin: 1rem 0; font-size: .9rem; }
    .scopes li { margin: .25rem 0; }
    .actions { display: flex; gap: .75rem; margin-top: 1.5rem; }
    button { flex: 1; padding: .75rem 1rem; border-radius: 8px; border: 0; font-weight: 600; cursor: pointer; font-size: .95rem; }
    .approve { background: #111; color: white; }
    .deny { background: #f4f4f6; color: #333; }
  </style>
</head>
<body>
  <form class="card" method="post" action="/oauth/authorize">
    <h1>Authorize <strong>${escapeHtml(client.name)}</strong></h1>
    <p>This app wants to act on your CommunityFix account. It will be able to:</p>
    <div class="scopes">
      <ul>
        <li>Search and read issues, solutions, and case studies on your behalf</li>
        <li>Create new issues, solutions, and case studies as you</li>
        <li>Update issues, solutions, and case studies you own</li>
        <li>Read your profile, including your email address and account status</li>
      </ul>
    </div>
    <input type="hidden" name="client_id" value="${escapeHtml(clientId)}">
    <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}">
    <input type="hidden" name="code_challenge" value="${escapeHtml(codeChallenge)}">
    <input type="hidden" name="code_challenge_method" value="${escapeHtml(codeChallengeMethod)}">
    <input type="hidden" name="scope" value="${escapeHtml(scope)}">
    <input type="hidden" name="resource" value="${escapeHtml(resource)}">
    <input type="hidden" name="csrf" value="${escapeHtml(csrf)}">
    ${state ? `<input type="hidden" name="state" value="${escapeHtml(state)}">` : ''}
    <div class="actions">
      <button type="submit" name="decision" value="deny" class="deny">Deny</button>
      <button type="submit" name="decision" value="approve" class="approve">Approve</button>
    </div>
    <p class="who">Signed in as <strong>${escapeHtml(session.user.email ?? session.user.id)}</strong>.</p>
  </form>
</body>
</html>`
})
