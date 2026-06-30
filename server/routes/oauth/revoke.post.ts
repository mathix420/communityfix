// RFC 7009 — Token Revocation. Accepts an access or refresh token and revokes
// it (and, for a refresh token, the access token it was issued alongside).
import { revokeToken } from '../../utils/oauth'
import { assertRateLimit, clientIp } from '../../utils/rate-limit'

interface RevokeBody {
  token?: string
  token_type_hint?: string
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store')
  setHeader(event, 'pragma', 'no-cache')

  await assertRateLimit(event, {
    bucket: 'oauth_revoke',
    identifier: clientIp(event),
    limit: 60,
    windowSec: 300,
  })

  const body = await readBody<RevokeBody>(event)
  // RFC 7009 §2.2: the endpoint responds 200 whether or not the token existed,
  // so a caller can't probe token validity here.
  if (body?.token) await revokeToken(body.token)

  setResponseStatus(event, 200)
  return {}
})
