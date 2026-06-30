import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

// The MCP `get_guide` tool serves the `guides` collection (content/guide/*.md).
// Every guide must carry the frontmatter the tool surfaces (title + description)
// so listings and fetches are useful.
const guidesDir = fileURLToPath(new URL('../../content/guide', import.meta.url))

function frontmatter(md: string): Record<string, string> {
  const m = /^---\n([\s\S]*?)\n---/.exec(md)
  if (!m) return {}
  return Object.fromEntries(
    m[1].split('\n')
      .map(line => /^(\w[\w-]*):\s*(.*)$/.exec(line.trim()))
      .filter((x): x is RegExpExecArray => x !== null)
      .map(x => [x[1], x[2].replace(/^["']|["']$/g, '')]),
  )
}

describe('authoring guides (content/guide)', () => {
  const files = readdirSync(guidesDir).filter(f => f.endsWith('.md'))

  it('has at least one guide', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files)('%s declares title + description frontmatter', (file) => {
    const fm = frontmatter(readFileSync(`${guidesDir}/${file}`, 'utf-8'))
    expect(fm.title?.length, `${file} is missing a title`).toBeGreaterThan(0)
    expect(fm.description?.length, `${file} is missing a description`).toBeGreaterThan(0)
  })
})
