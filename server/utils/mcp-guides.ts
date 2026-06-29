// Serves Nuxt Content markdown through the MCP tools: the authoring guides
// (content/guide/*.md, the `guides` collection) via `get_guide`, and the
// whitepaper (content/whitepaper.md, the `content` collection) via
// `get_whitepaper`. Both are queried at runtime from the bundled content DB, so
// editing the markdown is a content change — no code change, no tool redeploy.
import type { H3Event } from 'h3'
// Explicit server-side import: the bare auto-import is ambiguous with the
// client `queryCollection` (1-arg) and loses the event-first signature.
import { queryCollection } from '@nuxt/content/server'

function slugFromPath(path: string | undefined): string {
  return (path ?? '').replace(/^\/guide\//, '').replace(/^\//, '')
}

export interface GuideSummary {
  slug: string
  title: string | null
  description: string | null
}

/** List every available guide (slug + title + description) for discovery. */
export async function listGuides(event: H3Event): Promise<GuideSummary[]> {
  const docs = await queryCollection(event, 'guides').all()
  return docs
    .map(d => ({ slug: slugFromPath(d.path), title: d.title ?? null, description: d.description ?? null }))
    .filter(g => g.slug.length > 0)
}

/** Fetch a single guide's markdown by slug (e.g. "writing"). Null if missing. */
export async function getGuide(event: H3Event, slug: string) {
  const doc = await queryCollection(event, 'guides').path(`/guide/${slug}`).first()
  if (!doc) return null
  return {
    slug,
    title: doc.title ?? null,
    description: doc.description ?? null,
    url: doc.path,
    markdown: doc.rawbody ?? '',
  }
}

/** The CommunityFix whitepaper (content/whitepaper.md) as raw markdown. */
export async function getWhitepaper(event: H3Event) {
  const doc = await queryCollection(event, 'content').path('/whitepaper').first()
  return {
    title: doc?.title ?? 'CommunityFix Whitepaper',
    url: '/whitepaper',
    markdown: doc?.rawbody ?? '',
  }
}
