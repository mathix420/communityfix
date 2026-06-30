import { describe, it, expect } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

describe('MCP discovery + auth surface', () => {
  it('advertises the authorization server metadata (public clients, revocation)', async () => {
    const res = await fetch(`${BASE_URL}/.well-known/oauth-authorization-server`)
    expect(res.ok).toBe(true)
    const meta = await res.json()
    expect(meta.revocation_endpoint).toMatch(/\/oauth\/revoke$/)
    expect(meta.token_endpoint_auth_methods_supported).toEqual(['none'])
    expect(meta.code_challenge_methods_supported).toContain('S256')
    expect(meta.grant_types_supported).toContain('refresh_token')
  })

  it('points the protected-resource metadata at /api/mcp', async () => {
    const res = await fetch(`${BASE_URL}/.well-known/oauth-protected-resource`)
    expect(res.ok).toBe(true)
    const meta = await res.json()
    expect(meta.resource).toMatch(/\/api\/mcp$/)
    expect(meta.scopes_supported).toContain('mcp')
  })

  it('publishes a server card with the whitepaper tool and audience binding', async () => {
    const res = await fetch(`${BASE_URL}/.well-known/mcp/server-card.json`)
    expect(res.ok).toBe(true)
    const card = await res.json()
    expect(card.serverInfo.version).toBe('0.2.0')
    expect(card.tools.map((t: { name: string }) => t.name)).toContain('get_whitepaper')
    expect(card.auth.resourceIndicatorsSupported).toBe(true)
    expect(card.auth.revocationEndpoint).toMatch(/\/oauth\/revoke$/)
  })

  it('rejects unauthenticated POST /api/mcp with a discovery hint', async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    })
    expect(res.status).toBe(401)
    expect(res.headers.get('www-authenticate')).toContain('resource_metadata=')
  })

  it('rejects unauthenticated GET /api/mcp', async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`)
    expect(res.status).toBe(401)
  })
})

describe('dynamic client registration', () => {
  it('rejects registration without redirect_uris', async () => {
    const res = await fetch(`${BASE_URL}/oauth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: 'Test' }),
    })
    expect(res.status).toBe(400)
  })

  it('registers a public client (PKCE-only)', async () => {
    const res = await fetch(`${BASE_URL}/oauth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: 'Test MCP Client', redirect_uris: ['https://example.com/callback'] }),
    })
    expect(res.ok).toBe(true)
    const reg = await res.json()
    expect(typeof reg.client_id).toBe('string')
    expect(reg.token_endpoint_auth_method).toBe('none')
    expect(reg.grant_types).toContain('refresh_token')
  })
})
