import { describe, it, expect, vi } from 'vitest'

// newsletter-token reads the session secret through the Nitro
// `useRuntimeConfig` / `createError` globals; stub both so the helpers run
// under plain vitest (same approach as rate-limit.test.ts).
vi.stubGlobal('useRuntimeConfig', () => ({
  session: { password: 'test-secret-at-least-32-chars!!' },
}))
vi.stubGlobal('createError', (opts: { statusCode?: number; statusMessage?: string }) =>
  Object.assign(new Error(opts.statusMessage ?? 'error'), opts),
)

const { issueUnsubscribeToken, verifyUnsubscribeToken } =
  await import('../../server/utils/newsletter-token')

const USER_ID = 'f2b9dc5e-3c1a-4a6d-9f6c-2f4f4de1a111'

describe('newsletter unsubscribe tokens', () => {
  it('round-trips: a freshly issued token verifies to its user id', async () => {
    const token = await issueUnsubscribeToken(USER_ID)
    expect(token.startsWith(`${USER_ID}.`)).toBe(true)
    expect(await verifyUnsubscribeToken(token)).toBe(USER_ID)
  })

  it('rejects tampered tokens', async () => {
    const token = await issueUnsubscribeToken(USER_ID)
    // Flip the user id but keep the signature.
    const otherId = 'a2b9dc5e-3c1a-4a6d-9f6c-2f4f4de1a222'
    const forged = `${otherId}.${token.split('.')[1]}`
    expect(await verifyUnsubscribeToken(forged)).toBeNull()
    // Flip one signature character.
    const sig = token.split('.')[1]!
    const flipped = `${USER_ID}.${sig.slice(0, -1)}${sig.endsWith('0') ? '1' : '0'}`
    expect(await verifyUnsubscribeToken(flipped)).toBeNull()
  })

  it('rejects malformed input', async () => {
    expect(await verifyUnsubscribeToken('')).toBeNull()
    expect(await verifyUnsubscribeToken('no-dot')).toBeNull()
    expect(await verifyUnsubscribeToken('.only-sig')).toBeNull()
    expect(await verifyUnsubscribeToken(`${USER_ID}.`)).toBeNull()
  })
})
