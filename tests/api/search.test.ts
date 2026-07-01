import { describe, it, expect } from 'vitest'
import { apiFetch } from '../setup'

describe('GET /api/search', () => {
  it('returns too_short for a query under 3 characters', async () => {
    const res = await apiFetch('/api/search?query=hi')
    expect(res.status).toBe('too_short')
    expect(res.results).toEqual([])
  })

  it('returns too_short when no query is given', async () => {
    const res = await apiFetch('/api/search')
    expect(res.status).toBe('too_short')
    expect(res.results).toEqual([])
  })

  it('returns a status and a results array for a real query', async () => {
    const res = await apiFetch(
      '/api/search?query=' + encodeURIComponent('reduce household waste and improve recycling'),
    )
    expect(['ok', 'embeddings_unavailable']).toContain(res.status)
    expect(Array.isArray(res.results)).toBe(true)

    if (res.status === 'ok' && res.results.length > 0) {
      const first = res.results[0]
      expect(first).toHaveProperty('id')
      expect(first).toHaveProperty('title')
      expect(first).toHaveProperty('similarity')
      expect(['issue', 'solution']).toContain(first.type)
      expect(typeof first.similarity).toBe('number')
    }
  })

  it('restricts results to solutions when type=solution', async () => {
    const res = await apiFetch(
      '/api/search?query=' +
        encodeURIComponent('community solar energy program') +
        '&type=solution',
    )
    expect(['ok', 'embeddings_unavailable']).toContain(res.status)
    if (res.status === 'ok') {
      for (const r of res.results) expect(r.type).toBe('solution')
    }
  })
})
