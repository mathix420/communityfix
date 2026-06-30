import { getClient, issueAuthorizationCode } from '../../utils/oauth'

function redirectBack(redirectUri: string, params: Record<string, string>) {
  const u = new URL(redirectUri)
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
  return u.toString()
}

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody<Record<string, string>>(event)
  const clientId = body.client_id ?? ''
  const redirectUri = body.redirect_uri ?? ''
  const codeChallenge = body.code_challenge ?? ''
  const codeChallengeMethod = body.code_challenge_method ?? 'S256'
  const scope = body.scope ?? ''
  const state = body.state
  const decision = body.decision

  const client = await getClient(clientId)
  if (!client) throw createError({ statusCode: 400, statusMessage: 'Unknown client_id' })
  if (!client.redirectUris.includes(redirectUri)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'redirect_uri does not match a registered URI',
    })
  }

  if (decision !== 'approve') {
    return sendRedirect(
      event,
      redirectBack(redirectUri, {
        error: 'access_denied',
        error_description: 'User denied the authorization request',
        ...(state ? { state } : {}),
      }),
    )
  }

  if (!codeChallenge || codeChallengeMethod !== 'S256') {
    return sendRedirect(
      event,
      redirectBack(redirectUri, {
        error: 'invalid_request',
        error_description: 'Missing or unsupported PKCE parameters',
        ...(state ? { state } : {}),
      }),
    )
  }

  const code = await issueAuthorizationCode({
    clientId,
    userId: session.user.id,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    scope,
  })

  return sendRedirect(
    event,
    redirectBack(redirectUri, {
      code,
      ...(state ? { state } : {}),
    }),
  )
})
