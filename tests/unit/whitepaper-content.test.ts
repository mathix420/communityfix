import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

// The MCP `get_whitepaper` tool serves content/whitepaper.md straight from the
// `content` Nuxt Content collection (no bundled copy to keep in sync anymore).
// This guards the source file itself: a deletion / emptying / rename would make
// the tool return "unavailable", and this catches it at zero runtime cost.
const path = fileURLToPath(new URL('../../content/whitepaper.md', import.meta.url))

describe('whitepaper content (content/whitepaper.md)', () => {
  const md = readFileSync(path, 'utf-8')

  it('exists with substantial content', () => {
    expect(md.trim().length).toBeGreaterThan(500)
  })

  it('contains the sections the tool description promises', () => {
    expect(md).toContain('# Whitepaper')
    expect(md).toContain('Executive Summary')
  })
})
