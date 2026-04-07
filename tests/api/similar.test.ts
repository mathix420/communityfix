import { describe, it, expect } from 'vitest'
import { apiFetch } from '../setup'

describe('GET /api/issues/similar', () => {
  it('returns empty array when title is too short', async () => {
    const results = await apiFetch('/api/issues/similar?title=Hi&description=this%20is%20too%20short')

    expect(results).toEqual([])
  })

  it('returns empty array when description is too short', async () => {
    const results = await apiFetch('/api/issues/similar?title=A%20decent%20title%20here&description=short')

    expect(results).toEqual([])
  })

  it('returns empty array when no query params', async () => {
    const results = await apiFetch('/api/issues/similar')

    expect(results).toEqual([])
  })

  it('returns an array (possibly empty without API key or embeddings)', async () => {
    const results = await apiFetch(
      '/api/issues/similar?title=Reduce%20household%20waste%20and%20improve%20recycling&description=Every%20year%20millions%20of%20tons%20of%20waste%20end%20up%20in%20landfills',
    )

    expect(Array.isArray(results)).toBe(true)

    if (results.length > 0) {
      const first = results[0]
      expect(first).toHaveProperty('id')
      expect(first).toHaveProperty('title')
      expect(first).toHaveProperty('description')
      expect(first).toHaveProperty('similarity')
      expect(typeof first.similarity).toBe('number')
    }
  })
})
