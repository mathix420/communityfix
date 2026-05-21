// GET = SSE stream in the spec; we don't push, so 405. Auth-check first so
// probers still get the discovery hint.
import { authenticateBearer, getOrigin } from '../../utils/oauth'

export default defineEventHandler(async (event) => {
  const authed = await authenticateBearer(event)
  if (!authed) {
    setHeader(event, 'www-authenticate', `Bearer realm="MCP", resource_metadata="${getOrigin(event)}/.well-known/oauth-protected-resource"`)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  setHeader(event, 'allow', 'POST')
  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed — POST JSON-RPC requests instead.' })
})
