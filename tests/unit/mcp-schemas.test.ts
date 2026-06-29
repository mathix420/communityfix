import { describe, it, expect } from 'vitest'
import { mcpToolInputSchemas } from '../../server/utils/mcp-schemas'

describe('mcp tool input schemas', () => {
  it('accepts a minimal valid create_issue', () => {
    const r = mcpToolInputSchemas.create_issue.safeParse({ title: 'Plastic waste', summary: 'Too much plastic ends up in the sea.' })
    expect(r.success).toBe(true)
  })

  it('rejects an unknown scale', () => {
    const r = mcpToolInputSchemas.create_issue.safeParse({ title: 'x', summary: 'y', scale: 'planet' })
    expect(r.success).toBe(false)
  })

  it('rejects out-of-range coordinates', () => {
    const r = mcpToolInputSchemas.create_case_study.safeParse({
      solutionId: 1, outcome: 'success', locationName: 'Nowhere', latitude: 200, longitude: 0,
    })
    expect(r.success).toBe(false)
  })

  it('accepts confirmNew on create_issue', () => {
    const r = mcpToolInputSchemas.create_issue.safeParse({ title: 'x', summary: 'y', confirmNew: true })
    expect(r.success).toBe(true)
  })

  it('requires parentId for create_solution', () => {
    const missing = mcpToolInputSchemas.create_solution.safeParse({ title: 'x', summary: 'y' })
    expect(missing.success).toBe(false)
    const ok = mcpToolInputSchemas.create_solution.safeParse({ title: 'x', summary: 'y', parentId: 12 })
    expect(ok.success).toBe(true)
  })

  it('enforces required case-study fields and outcome enum', () => {
    expect(mcpToolInputSchemas.create_case_study.safeParse({ solutionId: 1 }).success).toBe(false)
    expect(mcpToolInputSchemas.create_case_study.safeParse({
      solutionId: 1, outcome: 'maybe', locationName: 'X', latitude: 0, longitude: 0,
    }).success).toBe(false)
    expect(mcpToolInputSchemas.create_case_study.safeParse({
      solutionId: 1, outcome: 'partial', locationName: 'X', latitude: 0, longitude: 0,
    }).success).toBe(true)
  })

  it('clamps search limit to the advertised range', () => {
    expect(mcpToolInputSchemas.search_issues_solutions.safeParse({ query: 'a', limit: 50 }).success).toBe(false)
    expect(mcpToolInputSchemas.search_issues_solutions.safeParse({ query: 'a', limit: 10 }).success).toBe(true)
  })

  it('requires an integer id for get_issue', () => {
    expect(mcpToolInputSchemas.get_issue.safeParse({ id: 'abc' }).success).toBe(false)
    expect(mcpToolInputSchemas.get_issue.safeParse({ id: 7 }).success).toBe(true)
  })
})
