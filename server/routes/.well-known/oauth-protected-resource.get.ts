// RFC 9728 — Protected Resource Metadata.
import { getOrigin } from '../../utils/oauth'

export default defineEventHandler((event) => {
  const origin = getOrigin(event)
  return {
    resource: `${origin}/api/mcp`,
    authorization_servers: [origin],
    bearer_methods_supported: ['header'],
    scopes_supported: ['mcp'],
  }
})
