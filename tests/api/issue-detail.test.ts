import { describe, it, expect } from 'vitest'
import { apiFetch } from '../setup'

describe('Issue Detail APIs', () => {
  describe('GET /api/issue/:id', () => {
    it('returns an existing issue', async () => {
      const issue = await apiFetch('/api/issue/1')

      expect(issue).toBeTruthy()
      expect(issue.id).toBe(1)
      expect(issue.title).toBe('Reduce household waste')
    })

    it('includes new fields (voteScore, location)', async () => {
      const issue = await apiFetch('/api/issue/1')

      expect(issue).toHaveProperty('voteScore')
      expect(issue).toHaveProperty('locationName')
      expect(issue).toHaveProperty('location')
      expect(issue).toHaveProperty('scale')
    })

    it('includes moderation fields for detail view', async () => {
      const issue = await apiFetch('/api/issue/1')

      expect(issue).toHaveProperty('rejectionReason')
      expect(issue).toHaveProperty('isSpam')
    })

    it('returns empty for non-existent issue', async () => {
      const issue = await apiFetch('/api/issue/99999')

      // Nuxt serializes null as empty string over HTTP
      expect(issue === null || issue === '').toBe(true)
    })
  })

  describe('GET /api/issue/:id/solutions', () => {
    it('returns solutions for an issue with solutions', async () => {
      const solutions = await apiFetch('/api/issue/1/solutions')

      expect(Array.isArray(solutions)).toBe(true)
      expect(solutions.length).toBeGreaterThan(0)

      for (const sol of solutions) {
        expect(sol.type).toBe('solution')
        expect(sol.parentId).toBe(1)
      }
    })

    it('returns solutions with expected fields', async () => {
      const solutions = await apiFetch('/api/issue/1/solutions')
      const sol = solutions[0]

      expect(sol).toHaveProperty('id')
      expect(sol).toHaveProperty('title')
      expect(sol).toHaveProperty('description')
      expect(sol).toHaveProperty('voteScore')
      expect(sol).toHaveProperty('tags')
    })
  })

  describe('GET /api/issue/:id/issues', () => {
    it('returns sub-issues for an issue', async () => {
      const subIssues = await apiFetch('/api/issue/1/issues')

      expect(Array.isArray(subIssues)).toBe(true)
      expect(subIssues.length).toBeGreaterThan(0)

      for (const sub of subIssues) {
        expect(sub.type).toBe('issue')
        expect(sub.parentId).toBe(1)
      }
    })
  })

  describe('POST /api/issue', () => {
    it('requires authentication', async () => {
      try {
        await apiFetch('/api/issue', {
          method: 'POST',
          body: JSON.stringify({ title: 'Test', description: 'Test description' }),
        })
        expect.unreachable()
      }
      catch (e: any) {
        expect(e.statusCode).toBe(401)
      }
    })
  })

  describe('POST /api/issue/:id/appeal', () => {
    it('requires authentication', async () => {
      try {
        await apiFetch('/api/issue/1/appeal', {
          method: 'POST',
          body: JSON.stringify({ reason: 'Test appeal' }),
        })
        expect.unreachable()
      }
      catch (e: any) {
        expect(e.statusCode).toBe(401)
      }
    })
  })
})
