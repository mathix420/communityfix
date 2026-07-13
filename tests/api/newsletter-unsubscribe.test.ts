import { describe, it, expect } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

// The unsubscribe endpoint renders HTML (visitors arrive from an email
// client), so this talks to fetch directly instead of apiFetch's JSON wrapper.
async function getUnsubscribe(query: string) {
  const res = await fetch(`${BASE_URL}/api/newsletter/unsubscribe${query}`)
  return { status: res.status, body: await res.text() }
}

describe('GET /api/newsletter/unsubscribe', () => {
  it('rejects a missing token with a branded 400 page', async () => {
    const { status, body } = await getUnsubscribe('')
    expect(status).toBe(400)
    expect(body).toContain('not valid')
    expect(body).toContain('CommunityFix')
  })

  it('rejects a garbage token', async () => {
    const { status, body } = await getUnsubscribe('?token=not-a-real-token')
    expect(status).toBe(400)
    expect(body).toContain('not valid')
  })

  it('rejects a well-formed token with a bad signature', async () => {
    const fake = `f2b9dc5e-3c1a-4a6d-9f6c-2f4f4de1a111.${'0'.repeat(64)}`
    const { status } = await getUnsubscribe(`?token=${fake}`)
    expect(status).toBe(400)
  })

  // A validly-signed token can only be minted with the server's session
  // secret; when the test env shares it (doppler dev config), assert the
  // idempotent happy path — unsubscribing an id with no prefs row still lands
  // on the confirmation page.
  it.skipIf(!process.env.NUXT_SESSION_PASSWORD)(
    'accepts a validly signed token even when no prefs row exists',
    async () => {
      const secret = process.env.NUXT_SESSION_PASSWORD!
      const userId = 'f2b9dc5e-3c1a-4a6d-9f6c-2f4f4de1a111'
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      )
      const sig = await crypto.subtle.sign(
        'HMAC',
        key,
        new TextEncoder().encode(`newsletter-unsub|${userId}`),
      )
      const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')

      const { status, body } = await getUnsubscribe(`?token=${userId}.${hex}`)
      expect(status).toBe(200)
      expect(body).toContain('unsubscribed')
    },
  )
})
