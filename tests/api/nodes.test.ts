import { describe, it, expect } from 'vitest'
import { apiFetch } from '../setup'

describe('GET /api/nodes', () => {
  it('400s when neither tag nor sdg is provided', async () => {
    await expect(apiFetch('/api/nodes')).rejects.toMatchObject({ statusCode: 400 })
  })

  it('lists approved issues/solutions carrying a given tag', async () => {
    const res = await apiFetch('/api/nodes?tag=water')
    expect(Array.isArray(res)).toBe(true)
    expect(res.length).toBeGreaterThan(0)
    for (const node of res) {
      expect(node.tags).toContain('water')
      expect(['issue', 'solution']).toContain(node.type)
      expect(node.status).toBe('approved')
    }
  })

  it('returns an empty array for a non-existent tag', async () => {
    const res = await apiFetch('/api/nodes?tag=nonexistenttag12345')
    expect(res).toEqual([])
  })

  it('restricts to solutions when type=solution', async () => {
    const res = await apiFetch('/api/nodes?tag=water&type=solution')
    expect(Array.isArray(res)).toBe(true)
    for (const node of res) expect(node.type).toBe('solution')
  })

  it('filters by SDG id', async () => {
    const res = await apiFetch('/api/nodes?sdg=1')
    expect(Array.isArray(res)).toBe(true)
    for (const node of res) {
      const ids = (node.sustainableDevelopmentGoals || []).map((s: any) => s.id)
      expect(ids).toContain(1)
    }
  })
})
