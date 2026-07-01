import { describe, it, expect } from 'vitest'
import { apiFetch } from '../setup'

describe('GET /api/nearby', () => {
  it('400s when coordinates are missing', async () => {
    await expect(apiFetch('/api/nearby')).rejects.toMatchObject({ statusCode: 400 })
  })

  it('400s when lat is not numeric', async () => {
    await expect(apiFetch('/api/nearby?lat=abc&lng=2.35')).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('returns items tagged with kind + distanceKm, ordered nearest-first', async () => {
    const res = await apiFetch('/api/nearby?lat=48.85&lng=2.35&radius=2000')
    expect(Array.isArray(res)).toBe(true)

    for (let i = 1; i < res.length; i++) {
      expect(res[i - 1].distanceKm <= res[i].distanceKm).toBe(true)
    }
    for (const item of res) {
      expect(['issue', 'solution', 'case-study']).toContain(item.kind)
      expect(typeof item.distanceKm).toBe('number')
      expect(item).toHaveProperty('item')
    }
  })

  it('restricts to a single kind when requested', async () => {
    const res = await apiFetch('/api/nearby?lat=48.85&lng=2.35&radius=2000&kind=case-study')
    expect(Array.isArray(res)).toBe(true)
    for (const item of res) expect(item.kind).toBe('case-study')
  })
})
