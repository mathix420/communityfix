import { describe, it, expect } from 'vitest'
import { apiFetch } from '../setup'

describe('GET /api/case-studies', () => {
  it('returns approved case studies with a degraded flag', async () => {
    const res = await apiFetch('/api/case-studies')
    expect(Array.isArray(res.items)).toBe(true)
    expect(typeof res.degraded).toBe('boolean')
    // No query was sent, so the recency list is the intended path.
    expect(res.degraded).toBe(false)
    for (const cs of res.items) {
      expect(cs.status).toBe('approved')
      expect(cs).toHaveProperty('outcome')
      expect(cs).toHaveProperty('solutionId')
    }
  })

  it('filters by outcome', async () => {
    const res = await apiFetch('/api/case-studies?outcome=success')
    expect(Array.isArray(res.items)).toBe(true)
    for (const cs of res.items) expect(cs.outcome).toBe('success')
  })

  it('ignores an invalid outcome value (no filter applied)', async () => {
    const res = await apiFetch('/api/case-studies?outcome=bogus')
    expect(Array.isArray(res.items)).toBe(true)
  })

  it('filters by verified', async () => {
    const res = await apiFetch('/api/case-studies?verified=true')
    expect(Array.isArray(res.items)).toBe(true)
    for (const cs of res.items) expect(cs.verified).toBe(true)
  })

  it('respects the limit parameter', async () => {
    const res = await apiFetch('/api/case-studies?limit=1')
    expect(Array.isArray(res.items)).toBe(true)
    expect(res.items.length).toBeLessThanOrEqual(1)
  })
})
