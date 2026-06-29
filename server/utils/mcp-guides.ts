// Serves the authoring guides (content/guide/*.md, the `guides` Nuxt Content
// collection) through the MCP `get_guide` tool. Content is queried at runtime
// from the bundled content DB, so editing a guide is a content change — no code
// change and no redeploy of the tool logic.
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
