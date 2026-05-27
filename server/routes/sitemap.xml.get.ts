import { and, eq, ne, sql } from 'drizzle-orm'
import { caseStudies, issues, tags, users } from '../database/schema'
import { getOrigin } from '../utils/oauth'

const MAX_URLS = 45_000

const STATIC_ROUTES: Array<{ loc: string, changefreq: string, priority: string }> = [
  { loc: '/', changefreq: 'daily', priority: '1.0' },
  { loc: '/whitepaper', changefreq: 'monthly', priority: '0.8' },
  { loc: '/guides', changefreq: 'weekly', priority: '0.7' },
  { loc: '/guide/writing', changefreq: 'monthly', priority: '0.6' },
  { loc: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { loc: '/terms', changefreq: 'yearly', priority: '0.3' },
]

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', '\'': '&apos;' }[c]!))
}

function urlEntry(loc: string, lastmod?: Date | null, changefreq?: string, priority?: string): string {
  const parts = [`    <loc>${escapeXml(loc)}</loc>`]
  if (lastmod) parts.push(`    <lastmod>${lastmod.toISOString()}</lastmod>`)
  if (changefreq) parts.push(`    <changefreq>${changefreq}</changefreq>`)
  if (priority) parts.push(`    <priority>${priority}</priority>`)
  return `  <url>\n${parts.join('\n')}\n  </url>`
}

export default defineEventHandler(async (event) => {
  const origin = getOrigin(event)
  const db = useDB()

  // Approved issues and solutions
  const approvedNodes = await db
    .select({
      id: issues.id,
      type: issues.type,
      updatedAt: issues.updatedAt,
    })
    .from(issues)
    .where(and(eq(issues.status, 'approved'), ne(issues.isSpam, true)))
    .orderBy(sql`${issues.updatedAt} DESC`)
    .limit(MAX_URLS)

  // Approved case studies
  const approvedCaseStudies = await db
    .select({
      id: caseStudies.id,
      updatedAt: caseStudies.updatedAt,
    })
    .from(caseStudies)
    .where(and(eq(caseStudies.status, 'approved'), ne(caseStudies.isSpam, true)))
    .orderBy(sql`${caseStudies.updatedAt} DESC`)
    .limit(MAX_URLS)

  // Tag pages
  const allTags = await db.select({ slug: tags.slug, updatedAt: tags.updatedAt }).from(tags)

  // Public user profiles (every user has a public page)
  const allUsers = await db
    .select({ id: users.id, updatedAt: users.updatedAt })
    .from(users)
    .orderBy(sql`${users.updatedAt} DESC`)
    .limit(10_000)

  const entries: string[] = []
  for (const route of STATIC_ROUTES) {
    entries.push(urlEntry(`${origin}${route.loc}`, null, route.changefreq, route.priority))
  }
  for (const n of approvedNodes) {
    entries.push(urlEntry(`${origin}/issue/${n.id}`, n.updatedAt, 'weekly', '0.7'))
  }
  for (const cs of approvedCaseStudies) {
    entries.push(urlEntry(`${origin}/case-study/${cs.id}`, cs.updatedAt, 'monthly', '0.6'))
  }
  for (const t of allTags) {
    entries.push(urlEntry(`${origin}/tag/${t.slug}`, t.updatedAt, 'weekly', '0.5'))
  }
  for (const u of allUsers) {
    entries.push(urlEntry(`${origin}/user/${u.id}`, u.updatedAt, 'monthly', '0.4'))
  }

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`
})
