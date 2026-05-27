// Renders known canonical routes as markdown for content-negotiation
// fallbacks (Accept: text/markdown). Returns null when the path is not
// one we recognize, so the caller can let HTML render instead.
import { and, desc, eq, inArray, isNull, ne } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { caseStudies, issueTags, issues, qualifications, tags, users } from '../database/schema'
import { issueWithRelations, transformIssue } from './transform-issue'

const ROOT_HEADER = `# CommunityFix

> CommunityFix is an open-source, community-driven platform where anyone can propose global challenges, submit solutions, and document real-world implementations as case studies.

The platform organizes knowledge as a tree:
- **Issues** describe problems worth solving (top-level or nested as sub-issues).
- **Solutions** propose a single approach to an issue.
- **Case studies** record one concrete real-world implementation of a solution.

Canonical site: https://communityfix.org/
`

function trim(s: string | null | undefined, n: number): string {
  if (!s) return ''
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`
}

async function renderHome(): Promise<string> {
  const db = useDB()
  const recent = await db.query.issues.findMany({
    where: and(isNull(issues.parentId), eq(issues.status, 'approved'), ne(issues.isSpam, true)),
    with: issueWithRelations,
    orderBy: desc(issues.createdAt),
    limit: 20,
  })
  const list = recent.map((i) => {
    const t = transformIssue(i)
    return `- [${t.title}](https://communityfix.org/issue/${t.id}) — ${trim(t.summary, 200)}`
  }).join('\n')

  return `${ROOT_HEADER}
## Recent issues

${list || '_No issues yet._'}

## Discovery for agents

- llms.txt:                ` + `https://communityfix.org/llms.txt
- sitemap.xml:             https://communityfix.org/sitemap.xml
- API catalog:             https://communityfix.org/.well-known/api-catalog
- MCP server card:         https://communityfix.org/.well-known/mcp/server-card.json
- Agent skills:            https://communityfix.org/.well-known/agent-skills/index.json
- MCP endpoint:            https://communityfix.org/api/mcp (OAuth 2.1 + PKCE)
`
}

async function renderIssue(id: number): Promise<string | null> {
  const db = useDB()
  const row = await db.query.issues.findFirst({
    where: eq(issues.id, id),
    with: issueWithRelations,
  })
  if (!row || row.status !== 'approved' || row.isSpam) return null
  const t = transformIssue(row)

  const kind = t.type === 'solution' ? 'Solution' : 'Issue'
  const parentLine = t.parentId ? `**Parent:** https://communityfix.org/issue/${t.parentId}\n\n` : ''
  const tagsLine = t.tags.length ? `**Tags:** ${t.tags.map(s => `\`${s}\``).join(', ')}\n\n` : ''
  const locLine = t.locationName ? `**Location:** ${t.locationName}${t.location ? ` (${t.location.latitude.toFixed(4)}, ${t.location.longitude.toFixed(4)})` : ''}${t.scale ? ` · scale: ${t.scale}` : ''}\n\n` : ''
  const sdgLine = t.sustainableDevelopmentGoals.length
    ? `**SDGs:** ${t.sustainableDevelopmentGoals.map(s => s.name).join(', ')}\n\n`
    : ''
  const counts = `**Votes:** ${t.voteScore} · **Solutions:** ${t.solutionCount} · **Sub-issues:** ${t.subIssueCount}`
  const links = (t.links?.length ?? 0) > 0
    ? `\n\n## Links\n\n${t.links!.map(l => `- [${l.title ?? l.url}](${l.url})`).join('\n')}`
    : ''

  return `# ${t.title}

${parentLine}**${kind} #${t.id}** · by ${t.author} · ${t.date}

${t.summary}

${tagsLine}${locLine}${sdgLine}${counts}

${t.description ?? ''}${links}

---

Canonical: https://communityfix.org/issue/${t.id}
`
}

async function renderCaseStudy(id: number): Promise<string | null> {
  const db = useDB()
  const row = await db.query.caseStudies.findFirst({
    where: eq(caseStudies.id, id),
    with: { solution: { columns: { id: true, title: true } } },
  })
  if (!row || row.status !== 'approved' || row.isSpam) return null

  const metricsBlock = row.metrics?.length
    ? `\n## Metrics\n\n${row.metrics.map(m => `- **${m.label}**: ${m.baseline ?? '–'} → ${m.result ?? '–'}${m.unit ? ` ${m.unit}` : ''}`).join('\n')}\n`
    : ''
  const lessonsBlock = row.lessonsLearned?.length
    ? `\n## Lessons learned\n\n${row.lessonsLearned.map(l => `- ${l}`).join('\n')}\n`
    : ''
  const sourcesBlock = row.sources?.length
    ? `\n## Sources\n\n${row.sources.map(s => `- [${s.title ?? s.url}](${s.url})`).join('\n')}\n`
    : ''
  const linksBlock = row.links?.length
    ? `\n## Links\n\n${row.links.map(s => `- [${s.title ?? s.url}](${s.url})`).join('\n')}\n`
    : ''
  const point = row.location as { x: number, y: number } | null

  return `# Case study #${row.id}

**Solution:** [${row.solution?.title ?? `#${row.solutionId}`}](https://communityfix.org/issue/${row.solutionId})

**Outcome:** ${row.outcome}${row.verified ? ' · verified' : ''}
**Location:** ${row.locationName}${point ? ` (${point.y.toFixed(4)}, ${point.x.toFixed(4)})` : ''}${row.scale ? ` · scale: ${row.scale}` : ''}
${row.implementer ? `**Implementer:** ${row.implementer}\n` : ''}${row.startDate ? `**Period:** ${row.startDate}${row.endDate ? ` → ${row.endDate}` : ''}\n` : ''}${row.cost ? `**Cost:** ${row.cost}${row.currency ? ` ${row.currency}` : ''}${row.fundingSource ? ` (${row.fundingSource})` : ''}\n` : ''}

${row.description ?? ''}
${metricsBlock}${lessonsBlock}${sourcesBlock}${linksBlock}
---

Canonical: https://communityfix.org/case-study/${row.id}
`
}

async function renderTag(slug: string): Promise<string | null> {
  const db = useDB()
  const tag = await db.query.tags.findFirst({ where: eq(tags.slug, slug) })
  if (!tag) return null

  const junction = await db.query.issueTags.findMany({
    where: eq(issueTags.tagId, tag.id),
    columns: { issueId: true },
  })
  const ids = junction.map(j => j.issueId)
  if (ids.length === 0) {
    return `# Tag: ${tag.name}\n\n_No issues yet._\n\nCanonical: https://communityfix.org/tag/${tag.slug}\n`
  }
  const rows = await db.query.issues.findMany({
    where: and(inArray(issues.id, ids), eq(issues.status, 'approved'), ne(issues.isSpam, true)),
    with: issueWithRelations,
    orderBy: desc(issues.createdAt),
    limit: 200,
  })
  const list = rows.map((r) => {
    const t = transformIssue(r)
    return `- [${t.title}](https://communityfix.org/issue/${t.id}) — ${trim(t.summary, 180)}`
  }).join('\n')

  return `# Tag: ${tag.name}

Slug: \`${tag.slug}\` · ${rows.length} approved issues/solutions.

${list}

---

Canonical: https://communityfix.org/tag/${tag.slug}
`
}

async function renderUser(id: string): Promise<string | null> {
  const db = useDB()
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { id: true, name: true, headline: true, bio: true, location: true, trustScore: true, createdAt: true },
  })
  if (!user) return null

  const userQuals = await db.query.qualifications.findMany({
    where: eq(qualifications.userId, id),
    columns: { title: true, area: true, detail: true },
  })
  const qualsBlock = userQuals.length
    ? `\n## Credentials\n\n${userQuals.map(q => `- **${q.title}** (${q.area})${q.detail ? `\n  ${q.detail}` : ''}`).join('\n')}\n`
    : ''

  const authored = await db.query.issues.findMany({
    where: and(eq(issues.authorId, id), eq(issues.status, 'approved'), ne(issues.isSpam, true)),
    columns: { id: true, title: true, summary: true, type: true },
    orderBy: desc(issues.createdAt),
    limit: 50,
  })
  const authoredBlock = authored.length
    ? `\n## Contributions\n\n${authored.map(a => `- ${a.type === 'solution' ? '_solution_' : '_issue_'} [${a.title}](https://communityfix.org/issue/${a.id}) — ${trim(a.summary, 160)}`).join('\n')}\n`
    : ''

  return `# ${user.name ?? 'Anonymous'}

${user.headline ?? ''}

${user.location ? `**Location:** ${user.location}\n` : ''}**Trust score:** ${user.trustScore}
**Joined:** ${user.createdAt?.toISOString().slice(0, 10) ?? '—'}

${user.bio ?? ''}
${qualsBlock}${authoredBlock}
---

Canonical: https://communityfix.org/user/${user.id}
`
}

// Raw markdown source for content pages is mirrored on the master branch
// of this repo on GitHub. Point agents there so they get the actual
// document body without us bundling the .md files into the Worker.
const RAW_CONTENT_BASE = 'https://raw.githubusercontent.com/mathix420/communityfix/refs/heads/master/content'

function renderContentPointer(title: string, contentPath: string, canonical: string, description: string): string {
  const rawUrl = `${RAW_CONTENT_BASE}${contentPath}.md`
  return `# ${title}

${description}

- Markdown source: ${rawUrl}
- Canonical HTML: ${canonical}
`
}

export async function renderPathAsMarkdown(path: string, _event: H3Event): Promise<string | null> {
  if (path === '/' || path === '') return renderHome()

  const issueMatch = path.match(/^\/issue\/(\d+)\/?$/)
  if (issueMatch) return renderIssue(parseInt(issueMatch[1]!, 10))

  const caseMatch = path.match(/^\/case-study\/(\d+)\/?$/)
  if (caseMatch) return renderCaseStudy(parseInt(caseMatch[1]!, 10))

  const tagMatch = path.match(/^\/tag\/([^/]+)\/?$/)
  if (tagMatch) return renderTag(decodeURIComponent(tagMatch[1]!))

  const userMatch = path.match(/^\/user\/([^/]+)\/?$/)
  if (userMatch) return renderUser(decodeURIComponent(userMatch[1]!))

  // Static content pages — the markdown body is checked into this repo at
  // /content/<path>.md, so we point agents at the GitHub raw URL rather
  // than re-serializing @nuxt/content's parsed AST or bundling the .md
  // files into the Worker.
  if (path === '/whitepaper') {
    return renderContentPointer(
      'CommunityFix whitepaper',
      '/whitepaper',
      'https://communityfix.org/whitepaper',
      'Vision, problem statement, incubation model, governance, and sustainability metrics.',
    )
  }
  if (path === '/privacy') {
    return renderContentPointer(
      'Privacy policy',
      '/privacy',
      'https://communityfix.org/privacy',
      'How CommunityFix handles personal data and tracking.',
    )
  }
  if (path === '/terms') {
    return renderContentPointer(
      'Terms of service',
      '/terms',
      'https://communityfix.org/terms',
      'Platform terms and conditions.',
    )
  }
  if (path === '/guides') {
    return `# Guides

Index of how-to guides for writing issues, solutions, and case studies.

- [Writing guide](https://communityfix.org/guide/writing) — markdown source: ${RAW_CONTENT_BASE}/guide/writing.md

Canonical: https://communityfix.org/guides
`
  }
  const guideMatch = path.match(/^\/guide\/([^/]+)\/?$/)
  if (guideMatch) {
    const slug = decodeURIComponent(guideMatch[1]!)
    return renderContentPointer(
      `Guide: ${slug}`,
      `/guide/${slug}`,
      `https://communityfix.org/guide/${slug}`,
      'How-to guide.',
    )
  }

  return null
}
