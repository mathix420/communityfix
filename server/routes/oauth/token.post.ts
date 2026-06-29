import { consumeAuthorizationCode, issueAccessToken, rotateRefreshToken, verifyPkce } from '../../utils/oauth'
import { assertRateLimit, clientIp } from '../../utils/rate-limit'

interface TokenBody {
  grant_type?: string
  code?: string
  redirect_uri?: string
  client_id?: string
  code_verifier?: string
  refresh_token?: string
  resource?: string
}

function err(statusCode: number, error: string, description: string) {
  return createError({ statusCode, data: { error, error_description: description }, statusMessage: error })
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store')
  setHeader(event, 'pragma', 'no-cache')

  await assertRateLimit(event, { bucket: 'oauth_token', identifier: clientIp(event), limit: 60, windowSec: 300 })

  const body = await readBody<TokenBody>(event)
  const grantType = body?.grant_type

  if (grantType === 'authorization_code') {
    const { code, redirect_uri, client_id, code_verifier } = body
    if (!code || !redirect_uri || !client_id || !code_verifier) {
      throw err(400, 'invalid_request', 'Missing required parameters')
    }
    const row = await consumeAuthorizationCode(code)
    if (!row) throw err(400, 'invalid_grant', 'Authorization code is invalid or expired')
    if (row.clientId !== client_id) throw err(400, 'invalid_grant', 'client_id does not match the code')
    if (row.redirectUri !== redirect_uri) throw err(400, 'invalid_grant', 'redirect_uri does not match the code')

    const ok = await verifyPkce(code_verifier, row.codeChallenge, row.codeChallengeMethod)
    if (!ok) throw err(400, 'invalid_grant', 'PKCE verification failed')

    // RFC 8707: if the client narrows the resource at the token step it must
    // match what was authorized; otherwise inherit the code's bound resource.
    if (body.resource && row.resource && body.resource.replace(/\/+$/, '') !== row.resource.replace(/\/+$/, '')) {
      throw err(400, 'invalid_target', 'resource does not match the authorized resource')
    }

    const { accessToken, refreshToken, expiresIn } = await issueAccessToken({
      clientId: row.clientId,
      userId: row.userId,
      scope: row.scope,
      resource: row.resource,
      withRefresh: true,
    })

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope: row.scope,
    }
  }

  if (grantType === 'refresh_token') {
    const { refresh_token } = body
    if (!refresh_token) throw err(400, 'invalid_request', 'refresh_token is required')
    const rotated = await rotateRefreshToken(refresh_token)
    if (!rotated) throw err(400, 'invalid_grant', 'refresh_token is invalid or expired')
    return {
      access_token: rotated.accessToken,
      token_type: 'Bearer',
      expires_in: rotated.expiresIn,
      refresh_token: rotated.refreshToken,
    }
  }

  throw err(400, 'unsupported_grant_type', `Grant type ${grantType ?? ''} is not supported`)
})
