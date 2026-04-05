import { describe, it, expect } from 'vitest'
import { apiFetch } from '../setup'

describe('Metadata APIs', () => {
  describe('GET /api/tags', () => {
    it('returns all tags', async () => {
      const tags = await apiFetch('/api/tags')

      expect(Array.isArray(tags)).toBe(true)
      expect(tags.length).toBeGreaterThan(0)

      const first = tags[0]
      expect(first).toHaveProperty('id')
      expect(first).toHaveProperty('slug')
      expect(first).toHaveProperty('name')
    })

    it('includes expected tags from seed data', async () => {
      const tags = await apiFetch('/api/tags')
      const slugs = tags.map((t: any) => t.slug)

      expect(slugs).toContain('environment')
      expect(slugs).toContain('transport')
      expect(slugs).toContain('water')
      expect(slugs).toContain('housing')
    })
  })

  describe('GET /api/sdgs', () => {
    it('returns all 17 SDGs', async () => {
      const sdgs = await apiFetch('/api/sdgs')

      expect(Array.isArray(sdgs)).toBe(true)
      expect(sdgs.length).toBe(17)
    })

    it('SDGs have expected fields', async () => {
      const sdgs = await apiFetch('/api/sdgs')
      const first = sdgs[0]

      expect(first).toHaveProperty('id')
      expect(first).toHaveProperty('name')
      expect(first).toHaveProperty('iconUrl')
      expect(first).toHaveProperty('link')
    })
  })

  describe('GET /api/user/:id', () => {
    it('returns a seeded user profile', async () => {
      const user = await apiFetch('/api/user/a0000001-0000-4000-8000-000000000001')

      expect(user).toHaveProperty('id')
      expect(user).toHaveProperty('name', 'Sarah Chen')
      expect(user).toHaveProperty('issues')
      expect(user).toHaveProperty('solutions')
      expect(Array.isArray(user.issues)).toBe(true)
      expect(Array.isArray(user.solutions)).toBe(true)
    })

    it('returns 404 for non-existent user', async () => {
      try {
        await apiFetch('/api/user/00000000-0000-0000-0000-000000000000')
        expect.unreachable()
      }
      catch (e: any) {
        expect(e.statusCode).toBe(404)
      }
    })

    it('user profile includes issues with new fields', async () => {
      const user = await apiFetch('/api/user/a0000001-0000-4000-8000-000000000001')

      if (user.issues.length > 0) {
        const issue = user.issues[0]
        expect(issue).toHaveProperty('voteScore')
        expect(issue).toHaveProperty('locationName')
      }
    })
  })
})
