import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * Keeps `public/llms.txt` honest.
 *
 * `llms.txt` is hand-maintained but advertises two things that drift from the
 * codebase over time: the list of MCP tools, and a handful of internal links.
 * These are pure file-parsing checks (no DB, no server) so they run in any
 * `vitest` invocation, including `bunx vitest run tests/unit`.
 *
 * If a tool is added to / removed from the MCP server, or a linked page is
 * renamed or deleted, the matching assertion below fails until `llms.txt` is
 * updated to match.
 */

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const SITE = 'https://communityfix.org'

const llmsTxt = readFileSync(join(ROOT, 'public/llms.txt'), 'utf-8')
const mcpHandler = readFileSync(join(ROOT, 'server/api/mcp/index.post.ts'), 'utf-8')

/** Tool names declared in the canonical `TOOLS` array of the MCP handler. */
function canonicalToolNames(): string[] {
  const start = mcpHandler.indexOf('const TOOLS = [')
  const end = mcpHandler.indexOf('] as const', start)
  expect(start, 'TOOLS array not found in MCP handler').toBeGreaterThan(-1)
  expect(end, 'end of TOOLS array not found in MCP handler').toBeGreaterThan(start)
  const slice = mcpHandler.slice(start, end)
  // Tool entries are the only `name: '...'` keys in the array — schema property
  // objects use `name: { ... }` (no quote), so requiring a quote is unambiguous.
  return [...slice.matchAll(/name:\s*'([a-z_0-9]+)'/g)].map((m) => m[1])
}

/** Returns the body of a `## <heading>` section in `llms.txt` up to the next heading. */
function section(heading: string): string {
  const lines = llmsTxt.split('\n')
  const startIdx = lines.findIndex((l) => l.trim() === `## ${heading}`)
  if (startIdx === -1) return ''
  const rest = lines.slice(startIdx + 1)
  const endRel = rest.findIndex((l) => l.startsWith('## '))
  return (endRel === -1 ? rest : rest.slice(0, endRel)).join('\n')
}

/** Tool names documented under the `## MCP Tools` section, e.g. `- get_issue: ...`. */
function documentedToolNames(): string[] {
  return [...section('MCP Tools').matchAll(/^- ([a-z_0-9]+):/gm)].map((m) => m[1])
}

/** Every absolute path linked at the production origin, anywhere in the file. */
function internalLinkPaths(): string[] {
  const re = new RegExp(`\\]\\(${SITE.replace(/[.]/g, '\\.')}(/[^)]*)?\\)`, 'g')
  return [...llmsTxt.matchAll(re)].map((m) => m[1] ?? '/')
}

/**
 * Does Nuxt's file-based router have a *literal* (non-dynamic) page for these
 * segments? Dynamic `[slug]` routes are intentionally excluded: a link to a
 * concrete path like `/guide/writing` should be backed by a concrete content
 * file (checked separately), not merely satisfied by a catch-all `[slug].vue`.
 */
function staticPageResolves(segments: string[]): boolean {
  let dir = join(ROOT, 'app/pages')
  if (segments.length === 0) return existsSync(join(dir, 'index.vue'))

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const isLast = i === segments.length - 1

    if (isLast) {
      return existsSync(join(dir, `${seg}.vue`)) || existsSync(join(dir, seg, 'index.vue'))
    }

    const next = join(dir, seg)
    if (!existsSync(next) || !statSync(next).isDirectory()) return false
    dir = next
  }
  return false
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory()
  } catch {
    return false
  }
}

/**
 * Is there a `server/api/...` event handler for a documented `/api/...` path?
 * Walks Nitro's file-based routes segment by segment. A `{id}` placeholder in
 * the documented path matches a `[param]` route file/dir; literals match by
 * name. The final segment resolves to `<name>.<method>.ts` or
 * `<name>/index.<method>.ts`.
 */
function apiHandlerExists(rest: string): boolean {
  const METHOD = '(get|post|put|patch|delete)'
  const segments = rest.split('/').filter(Boolean)
  let dir = join(ROOT, 'server/api')

  for (let i = 0; i < segments.length; i++) {
    const raw = segments[i]
    const isParam = /^\{.+\}$/.test(raw)
    const matchesName = (base: string) => (isParam ? /^\[.+\]$/.test(base) : base === raw)

    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return false
    }

    if (i === segments.length - 1) {
      const fileHit = entries.some((f) => {
        const m = f.match(new RegExp(`^(.+)\\.${METHOD}\\.ts$`))
        return m ? matchesName(m[1]) : false
      })
      if (fileHit) return true
      const dirHit = entries.find((e) => matchesName(e) && isDir(join(dir, e)))
      return dirHit
        ? readdirSync(join(dir, dirHit)).some((f) => new RegExp(`^index\\.${METHOD}\\.ts$`).test(f))
        : false
    }

    const sub = entries.find((e) => matchesName(e) && isDir(join(dir, e)))
    if (!sub) return false
    dir = join(dir, sub)
  }
  return false
}

/** A documented internal link is valid if a content file, static page, or API handler backs it. */
function internalLinkResolves(path: string): boolean {
  if (path.startsWith('/api/')) return apiHandlerExists(path.slice('/api/'.length))
  const segments = path.split('/').filter(Boolean)
  // Content-driven routes (guides, legal pages) resolve via @nuxt/content markdown.
  if (existsSync(join(ROOT, 'content', `${segments.join('/')}.md`))) return true
  return staticPageResolves(segments)
}

describe('public/llms.txt', () => {
  it('documents exactly the MCP tools the server exposes', () => {
    const canonical = canonicalToolNames()
    const documented = documentedToolNames()

    // Sanity: both lists were actually parsed.
    expect(canonical.length).toBeGreaterThan(0)
    expect(documented.length).toBeGreaterThan(0)

    const missing = canonical.filter((t) => !documented.includes(t))
    const stale = documented.filter((t) => !canonical.includes(t))

    expect(missing, `MCP tools missing from llms.txt: ${missing.join(', ')}`).toEqual([])
    expect(stale, `tools in llms.txt no longer exposed by the server: ${stale.join(', ')}`).toEqual(
      [],
    )
    expect([...documented].sort()).toEqual([...canonical].sort())
  })

  it('lists each MCP tool at most once', () => {
    const documented = documentedToolNames()
    expect(documented.length).toBe(new Set(documented).size)
  })

  it('advertises the public REST endpoints for non-MCP clients', () => {
    const apiPaths = internalLinkPaths().filter((p) => p.startsWith('/api/'))
    // The read-only REST surface must be listed so LLM clients that can't speak
    // MCP can still browse the catalog over plain HTTP GET.
    const core = [
      '/api/issues',
      '/api/issue/{id}',
      '/api/issue/{id}/tree',
      '/api/issue/{id}/solutions',
      '/api/issue/{id}/case-studies',
      '/api/case-study/{id}',
      '/api/tags',
      '/api/sdgs',
      '/api/user/{id}',
    ]
    const undocumented = core.filter((p) => !apiPaths.includes(p))
    expect(
      undocumented,
      `core REST endpoints missing from llms.txt: ${undocumented.join(', ')}`,
    ).toEqual([])
  })

  it('only links internal pages that actually exist', () => {
    const paths = internalLinkPaths()
    expect(paths.length).toBeGreaterThan(0)

    const broken = paths.filter((p) => !internalLinkResolves(p))
    expect(broken, `llms.txt links to non-existent routes: ${broken.join(', ')}`).toEqual([])
  })

  it('keeps the required top-level structure', () => {
    expect(llmsTxt.startsWith('# CommunityFix')).toBe(true)
    // The blockquote summary the llms.txt spec expects right after the H1.
    expect(llmsTxt).toMatch(/\n> .+/)
    expect(section('MCP Tools').trim().length).toBeGreaterThan(0)
  })
})
