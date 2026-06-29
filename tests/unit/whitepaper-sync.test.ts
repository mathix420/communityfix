import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { WHITEPAPER_MARKDOWN, getWhitepaper } from '../../server/utils/whitepaper'

// The MCP `get_whitepaper` tool serves a bundled copy of content/whitepaper.md
// (Workers have no filesystem). This guards against the two drifting apart.
describe('whitepaper bundle', () => {
  it('stays in sync with content/whitepaper.md', () => {
    const path = fileURLToPath(new URL('../../content/whitepaper.md', import.meta.url))
    const fromFile = readFileSync(path, 'utf-8')
    expect(WHITEPAPER_MARKDOWN.trim()).toBe(fromFile.trim())
  })

  it('exposes a structured payload', () => {
    const wp = getWhitepaper()
    expect(wp.title).toBe('CommunityFix Whitepaper')
    expect(wp.url).toBe('/whitepaper')
    expect(wp.markdown).toContain('Executive Summary')
  })
})
