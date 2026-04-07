import { describe, it, expect } from 'vitest'
import { apiFetch } from '../setup'

describe('GET /api/issues', () => {
  it('returns a list of issues', async () => {
    const issues = await apiFetch('/api/issues')

    expect(Array.isArray(issues)).toBe(true)
    expect(issues.length).toBeGreaterThan(0)
  })

  it('returns issues with expected fields', async () => {
    const issues = await apiFetch('/api/issues')
    const issue = issues[0]

    expect(issue).toHaveProperty('id')
    expect(issue).toHaveProperty('title')
    expect(issue).toHaveProperty('description')
    expect(issue).toHaveProperty('author')
    expect(issue).toHaveProperty('date')
    expect(issue).toHaveProperty('voteScore')
    expect(issue).toHaveProperty('tags')
    expect(issue).toHaveProperty('locationName')
    expect(issue).toHaveProperty('location')
    expect(issue).toHaveProperty('scale')
    expect(issue).toHaveProperty('sustainableDevelopmentGoals')
  })

  it('returns only top-level issues (no parentId)', async () => {
    const issues = await apiFetch('/api/issues')

    for (const issue of issues) {
      expect(issue.parentId).toBeNull()
    }
  })

  it('does not return rejected issues', async () => {
    const issues = await apiFetch('/api/issues')

    for (const issue of issues) {
      expect(issue.status).not.toBe('rejected')
    }
  })

  it('sorts by newest by default', async () => {
    const issues = await apiFetch('/api/issues')

    for (let i = 1; i < issues.length; i++) {
      expect(issues[i - 1].date >= issues[i].date).toBe(true)
    }
  })

  it('sorts by oldest when requested', async () => {
    const issues = await apiFetch('/api/issues?sort=oldest')

    for (let i = 1; i < issues.length; i++) {
      expect(issues[i - 1].date <= issues[i].date).toBe(true)
    }
  })

  it('sorts by most_voted', async () => {
    const issues = await apiFetch('/api/issues?sort=most_voted')

    for (let i = 1; i < issues.length; i++) {
      expect(issues[i - 1].voteScore >= issues[i].voteScore).toBe(true)
    }
  })

  it('filters by tag', async () => {
    const issues = await apiFetch('/api/issues?tag=water')

    expect(issues.length).toBeGreaterThan(0)
    for (const issue of issues) {
      expect(issue.tags).toContain('water')
    }
  })

  it('returns empty array for non-existent tag', async () => {
    const issues = await apiFetch('/api/issues?tag=nonexistenttag12345')

    expect(issues).toEqual([])
  })

  it('searches issues by text', async () => {
    const issues = await apiFetch('/api/issues?search=water')

    expect(issues.length).toBeGreaterThan(0)
    const titles = issues.map((i: any) => i.title.toLowerCase())
    const hasWaterRelated = titles.some((t: string) => t.includes('water') || t.includes('hydro'))
    expect(hasWaterRelated).toBe(true)
  })

  it('returns empty array for search with no matches', async () => {
    const issues = await apiFetch('/api/issues?search=xyznonexistent123456')

    expect(issues).toEqual([])
  })

  it('combines search and sort', async () => {
    const issues = await apiFetch('/api/issues?search=waste&sort=oldest')

    expect(Array.isArray(issues)).toBe(true)
  })

  it('combines tag and sort', async () => {
    const issues = await apiFetch('/api/issues?tag=climate&sort=most_voted')

    expect(Array.isArray(issues)).toBe(true)
    for (const issue of issues) {
      expect(issue.tags).toContain('climate')
    }
  })
})
