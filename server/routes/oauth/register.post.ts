// RFC 7591 — Dynamic Client Registration. Public clients only (PKCE-only, no secret).
import { oauthClients } from '../../database/schema'
import { randomToken } from '../../utils/oauth'

interface RegistrationBody {
  client_name?: string
  redirect_uris?: string[]
  token_endpoint_auth_method?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<RegistrationBody>(event)
  const redirectUris = Array.isArray(body?.redirect_uris)
    ? body.redirect_uris.filter((u) => typeof u === 'string')
    : []
  if (redirectUris.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'redirect_uris is required' })
  }
  for (const uri of redirectUris) {
    try {
      const u = new URL(uri)
      // OAuth 2.1 native-app rules: https, http loopback, or custom scheme.
      const isHttps = u.protocol === 'https:'
      const isLocalhost =
        u.protocol === 'http:' &&
        (u.hostname === '127.0.0.1' || u.hostname === 'localhost' || u.hostname === '[::1]')
      const isCustomScheme =
        /^[a-z][a-z0-9+.-]*:$/i.test(u.protocol) && !['http:', 'https:'].includes(u.protocol)
      if (!isHttps && !isLocalhost && !isCustomScheme) {
        throw createError({
          statusCode: 400,
          statusMessage: `redirect_uri ${uri} must be https://, http://localhost, or a custom scheme`,
        })
      }
    } catch (e) {
      if ((e as { statusCode?: number }).statusCode) throw e
      throw createError({
        statusCode: 400,
        statusMessage: `redirect_uri ${uri} is not a valid URL`,
      })
    }
  }

  const db = useDB()
  const clientId = randomToken(16)
  await db.insert(oauthClients).values({
    id: clientId,
    name: (body?.client_name ?? 'MCP Client').slice(0, 200),
    redirectUris,
    secretHash: null,
  })

  return {
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: redirectUris,
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
  }
})
