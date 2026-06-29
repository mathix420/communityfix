import { describe, it, expect } from 'vitest'
import { randomToken, sha256Hex, verifyPkce } from '../../server/utils/oauth'

// Pure crypto helpers — no DB / runtime context needed.
describe('oauth crypto helpers', () => {
  it('verifies a correct S256 PKCE pair and rejects mismatches', async () => {
    const verifier = randomToken(32)
    // challenge = base64url(sha256(verifier))
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    expect(await verifyPkce(verifier, challenge, 'S256')).toBe(true)
    expect(await verifyPkce('wrong-verifier', challenge, 'S256')).toBe(false)
    // Only S256 is supported — plain must be refused.
    expect(await verifyPkce(verifier, verifier, 'plain')).toBe(false)
  })

  it('produces url-safe, unique, non-padded tokens', () => {
    const a = randomToken(32)
    const b = randomToken(32)
    expect(a).not.toBe(b)
    expect(a).not.toMatch(/[+/=]/)
  })

  it('hashes deterministically to 64 hex chars', async () => {
    const h1 = await sha256Hex('token')
    const h2 = await sha256Hex('token')
    expect(h1).toBe(h2)
    expect(h1).toMatch(/^[0-9a-f]{64}$/)
    expect(await sha256Hex('other')).not.toBe(h1)
  })
})
