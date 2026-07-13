import { describe, it, expect } from 'vitest'
import { apiFetch } from '../setup'

// All onboarding/preferences endpoints are session-scoped: the public
// contract is that anonymous callers get a 401 on every one of them.
describe('Onboarding and preferences API', () => {
  describe('GET /api/me/interests', () => {
    it('requires authentication', async () => {
      try {
        await apiFetch('/api/me/interests')
        expect.unreachable()
      } catch (e: any) {
        expect(e.statusCode).toBe(401)
      }
    })
  })

  describe('POST /api/me/interests', () => {
    it('requires authentication', async () => {
      try {
        await apiFetch('/api/me/interests', {
          method: 'POST',
          body: JSON.stringify({ label: 'beekeeping' }),
        })
        expect.unreachable()
      } catch (e: any) {
        expect(e.statusCode).toBe(401)
      }
    })
  })

  describe('DELETE /api/me/interests/:id', () => {
    it('requires authentication', async () => {
      try {
        await apiFetch('/api/me/interests/1', { method: 'DELETE' })
        expect.unreachable()
      } catch (e: any) {
        expect(e.statusCode).toBe(401)
      }
    })
  })

  describe('GET /api/tags/similar', () => {
    it('requires authentication', async () => {
      try {
        await apiFetch('/api/tags/similar?q=pollinators')
        expect.unreachable()
      } catch (e: any) {
        expect(e.statusCode).toBe(401)
      }
    })
  })

  describe('GET /api/me/newsletter', () => {
    it('requires authentication', async () => {
      try {
        await apiFetch('/api/me/newsletter')
        expect.unreachable()
      } catch (e: any) {
        expect(e.statusCode).toBe(401)
      }
    })
  })

  describe('PUT /api/me/newsletter', () => {
    it('requires authentication', async () => {
      try {
        await apiFetch('/api/me/newsletter', {
          method: 'PUT',
          body: JSON.stringify({ enabled: true, frequency: 'monthly', content: {} }),
        })
        expect.unreachable()
      } catch (e: any) {
        expect(e.statusCode).toBe(401)
      }
    })
  })

  describe('POST /api/me/onboarded', () => {
    it('requires authentication', async () => {
      try {
        await apiFetch('/api/me/onboarded', { method: 'POST' })
        expect.unreachable()
      } catch (e: any) {
        expect(e.statusCode).toBe(401)
      }
    })
  })
})
