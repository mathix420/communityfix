import { describe, it, expect } from 'vitest'
import { apiFetch } from '../setup'

describe('Votes API', () => {
  describe('GET /api/issue/:id/votes', () => {
    it('returns vote data for an existing issue', async () => {
      const data = await apiFetch('/api/issue/1/votes')

      expect(data).toHaveProperty('score')
      expect(data).toHaveProperty('userVote')
      expect(typeof data.score).toBe('number')
      expect(data.userVote).toBeNull()
    })

    it('returns 404 for non-existent issue', async () => {
      try {
        await apiFetch('/api/issue/99999/votes')
        expect.unreachable()
      }
      catch (e: any) {
        expect(e.statusCode).toBe(404)
      }
    })

    it('returns 400 for invalid issue ID', async () => {
      try {
        await apiFetch('/api/issue/abc/votes')
        expect.unreachable()
      }
      catch (e: any) {
        expect(e.statusCode).toBe(400)
      }
    })

    it('returns the seeded score for issue 1 (5 upvotes - 1 downvote = +5)', async () => {
      // See server/database/seed/006_votes.sql — issue 1 has 6 +1 votes and
      // 1 -1 vote, all with default weight=1, so vote_score should be 5.
      const data = await apiFetch('/api/issue/1/votes')

      expect(data.score).toBe(5)
    })

    it('returns score of 0 for an issue with no seeded votes', async () => {
      // Issue 8 has no rows in the votes seed.
      const data = await apiFetch('/api/issue/8/votes')

      expect(data.score).toBe(0)
    })
  })

  describe('POST /api/issue/:id/vote', () => {
    it('requires authentication', async () => {
      try {
        await apiFetch('/api/issue/1/vote', {
          method: 'POST',
          body: JSON.stringify({ value: 1 }),
        })
        expect.unreachable()
      }
      catch (e: any) {
        expect(e.statusCode).toBe(401)
      }
    })
  })

  describe('DELETE /api/issue/:id/vote', () => {
    it('requires authentication', async () => {
      try {
        await apiFetch('/api/issue/1/vote', {
          method: 'DELETE',
        })
        expect.unreachable()
      }
      catch (e: any) {
        expect(e.statusCode).toBe(401)
      }
    })
  })
})
