import { describe, it, expect } from 'vitest'
import { apiFetch } from '../setup'

describe('GET /api/issues/similar', () => {
  it('returns too_short status when title is too short', async () => {
    const response = await apiFetch('/api/issues/similar?title=Hi&description=this%20is%20too%20short')

    expect(response.status).toBe('too_short')
    expect(response.results).toEqual([])
  })

  it('returns too_short status when description is too short', async () => {
    const response = await apiFetch('/api/issues/similar?title=A%20decent%20title%20here&description=short')

    expect(response.status).toBe('too_short')
    expect(response.results).toEqual([])
  })

  it('returns too_short status when no query params', async () => {
    const response = await apiFetch('/api/issues/similar')

    expect(response.status).toBe('too_short')
    expect(response.results).toEqual([])
  })

  it('returns ok or unavailable status with results array for a real query', async () => {
    const response = await apiFetch(
      '/api/issues/similar?title=Reduce%20household%20waste%20and%20improve%20recycling&description=Every%20year%20millions%20of%20tons%20of%20waste%20end%20up%20in%20landfills',
    )

    expect(['ok', 'unavailable']).toContain(response.status)
    expect(Array.isArray(response.results)).toBe(true)

    if (response.results.length > 0) {
      const first = response.results[0]
      expect(first).toHaveProperty('id')
      expect(first).toHaveProperty('title')
      expect(first).toHaveProperty('description')
      expect(first).toHaveProperty('similarity')
      expect(typeof first.similarity).toBe('number')
    }
  })
})
