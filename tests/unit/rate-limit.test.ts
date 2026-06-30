import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// rateLimit() reads/writes the `auth` storage through Nitro's `useStorage`
// global. Stub it with a minimal in-memory store (a Map matching the
// getItem/setItem surface rateLimit uses) so the limiter is testable without a
// real KV binding and without pulling unstorage in as a test-only dependency.
function memStorage() {
  const m = new Map<string, unknown>()
  return {
    getItem: async (key: string) => (m.has(key) ? m.get(key) : null),
    setItem: async (key: string, value: unknown) => {
      m.set(key, value)
    },
  }
}

// The closure reads `store` at call time, so reassigning it per-test gives each
// case a fresh, isolated store.
let store = memStorage()
vi.stubGlobal('useStorage', () => store)

const { rateLimit } = await import('../../server/utils/rate-limit')

const opts = { bucket: 't', identifier: 'u', limit: 3, windowSec: 60 }

describe('rateLimit (KV fixed-window)', () => {
  beforeEach(() => {
    store = memStorage()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.stubGlobal('useStorage', () => store)
  })

  it('counts up within a window and blocks past the limit', async () => {
    expect(await rateLimit(opts)).toMatchObject({ allowed: true, remaining: 2 })
    expect(await rateLimit(opts)).toMatchObject({ allowed: true, remaining: 1 })
    expect(await rateLimit(opts)).toMatchObject({ allowed: true, remaining: 0 })
    const blocked = await rateLimit(opts)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it('resets the counter once the window rolls over', async () => {
    for (let i = 0; i < 4; i++) await rateLimit(opts)
    // Cross the 60s window boundary — the window-start key changes, so the
    // counter starts fresh.
    vi.setSystemTime(new Date('2026-01-01T00:01:00Z'))
    expect(await rateLimit(opts)).toMatchObject({ allowed: true, remaining: 2 })
  })

  it('keeps resetAt aligned to the end of the current window', async () => {
    const r = await rateLimit(opts)
    expect(r.resetAt.toISOString()).toBe('2026-01-01T00:01:00.000Z')
  })

  it('tolerates a sub-60s window without throwing (TTL floor)', async () => {
    const r = await rateLimit({ ...opts, windowSec: 30 })
    expect(r.allowed).toBe(true)
  })

  it('fails OPEN when KV throws', async () => {
    vi.stubGlobal('useStorage', () => ({
      getItem: () => {
        throw new Error('kv down')
      },
      setItem: () => {},
    }))
    const r = await rateLimit({ ...opts, limit: 1 })
    expect(r.allowed).toBe(true)
    expect(r.remaining).toBe(1)
  })
})
