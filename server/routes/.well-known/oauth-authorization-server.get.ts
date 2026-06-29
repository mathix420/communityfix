// RFC 8414 — Authorization Server Metadata.
import { getOrigin } from '../../utils/oauth'

export default defineEventHandler((event) => {
  const origin = getOrigin(event)
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    revocation_endpoint: `${origin}/oauth/revoke`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    // Public clients only (PKCE, no secret) — the token endpoint never reads a
    // client secret, so advertise just `none`.
    token_endpoint_auth_methods_supported: ['none'],
    revocation_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['mcp'],
  }
})
