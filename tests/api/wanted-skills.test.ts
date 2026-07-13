import { describe, it, expect } from 'vitest'
import { apiFetch } from '../setup'

describe('Wanted skills API', () => {
  describe('GET /api/issue/:id/wanted-skills', () => {
    it('returns an array for an existing issue', async () => {
      const data = await apiFetch('/api/issue/1/wanted-skills')

      expect(Array.isArray(data)).toBe(true)
      for (const item of data) {
        expect(item).toHaveProperty('id')
        expect(item).toHaveProperty('skill')
        expect(item).toHaveProperty('createdBy')
        expect(item).toHaveProperty('createdById')
        expect(item).toHaveProperty('createdAt')
      }
    })

    it('returns 404 for non-existent issue', async () => {
      try {
        await apiFetch('/api/issue/99999/wanted-skills')
        expect.unreachable()
      } catch (e: any) {
        expect(e.statusCode).toBe(404)
      }
    })

    it('returns 400 for invalid issue ID', async () => {
      try {
        await apiFetch('/api/issue/abc/wanted-skills')
        expect.unreachable()
      } catch (e: any) {
        expect(e.statusCode).toBe(400)
      }
    })
  })

  describe('POST /api/issue/:id/wanted-skills', () => {
    it('requires authentication', async () => {
      try {
        await apiFetch('/api/issue/1/wanted-skills', {
          method: 'POST',
          body: JSON.stringify({ skill: 'GIS mapping' }),
        })
        expect.unreachable()
      } catch (e: any) {
        expect(e.statusCode).toBe(401)
      }
    })
  })

  describe('DELETE /api/issue/:id/wanted-skills/:skillId', () => {
    it('requires authentication', async () => {
      try {
        await apiFetch('/api/issue/1/wanted-skills/1', {
          method: 'DELETE',
        })
        expect.unreachable()
      } catch (e: any) {
        expect(e.statusCode).toBe(401)
      }
    })
  })
})
