// Markdown rendering for issues / solutions / case studies — used by the
// `/issue/{id}.md` and `/case-study/{id}.md` routes so agents can fetch
// the canonical content directly without scraping HTML.
import { and, desc, eq, ne } from 'drizzle-orm'
import { caseStudies, issues } from '../database/schema'
import { issueWithRelations, transformIssue } from './transform-issue'

const CANONICAL_BASE = 'https://communityfix.org'

function trim(s: string | null | undefined, n: number): string {
  if (!s) return ''
  const clean = s.replace(/\s+/g, ' ').trim()
  return clean.length <= n ? clean : `${clean.slice(0, n - 1)}…`
}

export async function renderIssueMarkdown(id: number): Promise<string | null> {
  const db = useDB()
  const row = await db.query.issues.findFirst({
    where: eq(issues.id, id),
    with: issueWithRelations,
  })
  if (!row || row.status !== 'approved' || row.isSpam) return null
  const t = transformIssue(row)

  const kind = t.type === 'solution' ? 'Solution' : 'Issue'
  const lines: string[] = [`# ${t.title}`, '']
  if (t.parentId) lines.push(`**Parent:** ${CANONICAL_BASE}/issue/${t.parentId}`, '')
  lines.push(`**${kind} #${t.id}** · by ${t.author} · ${t.date}`, '', t.summary, '')
  if (t.tags.length) lines.push(`**Tags:** ${t.tags.map(s => `\`${s}\``).join(', ')}`, '')
  if (t.locationName) {
    const coords = t.location ? ` (${t.location.latitude.toFixed(4)}, ${t.location.longitude.toFixed(4)})` : ''
    const scale = t.scale ? ` · scale: ${t.scale}` : ''
    lines.push(`**Location:** ${t.locationName}${coords}${scale}`, '')
  }
  if (t.sustainableDevelopmentGoals.length) {
    lines.push(`**SDGs:** ${t.sustainableDevelopmentGoals.map(s => s.name).join(', ')}`, '')
  }
  lines.push(`**Votes:** ${t.voteScore} · **Solutions:** ${t.solutionCount} · **Sub-issues:** ${t.subIssueCount}`, '')
  if (t.description) lines.push(t.description, '')
  if (t.links?.length) {
    lines.push('## Links', '', ...t.links.map(l => `- [${l.title ?? l.url}](${l.url})`), '')
  }

  // Children: sub-issues + solutions live in the same table, distinguished by
  // `type`. Solutions can't have children, so this only runs for issues.
  if (t.type === 'issue') {
    const children = await db.query.issues.findMany({
      where: and(eq(issues.parentId, t.id), eq(issues.status, 'approved'), ne(issues.isSpam, true)),
      columns: { id: true, title: true, summary: true, type: true },
      orderBy: desc(issues.createdAt),
    })
    const subIssues = children.filter(c => c.type === 'issue')
    const solutions = children.filter(c => c.type === 'solution')

    if (solutions.length) {
      lines.push('', '## Solutions', '')
      for (const s of solutions) {
        lines.push(`- [${s.title}](${CANONICAL_BASE}/issue/${s.id}.md) — ${trim(s.summary, 200)}`)
      }
    }
    if (subIssues.length) {
      lines.push('', '## Sub-issues', '')
      for (const c of subIssues) {
        lines.push(`- [${c.title}](${CANONICAL_BASE}/issue/${c.id}.md) — ${trim(c.summary, 200)}`)
      }
    }
  }

  // Case studies hang off solutions only.
  if (t.type === 'solution') {
    const studies = await db.query.caseStudies.findMany({
      where: and(eq(caseStudies.solutionId, t.id), eq(caseStudies.status, 'approved'), ne(caseStudies.isSpam, true)),
      columns: { id: true, outcome: true, locationName: true, description: true },
      orderBy: desc(caseStudies.createdAt),
    })
    if (studies.length) {
      lines.push('', '## Case studies', '')
      for (const cs of studies) {
        const headline = `${cs.outcome} · ${cs.locationName}`
        lines.push(`- [#${cs.id} — ${headline}](${CANONICAL_BASE}/case-study/${cs.id}.md)${cs.description ? ` — ${trim(cs.description, 200)}` : ''}`)
      }
    }
  }

  lines.push('', '---', '', `Canonical: ${CANONICAL_BASE}/issue/${t.id}`)
  return lines.join('\n')
}

export async function renderCaseStudyMarkdown(id: number): Promise<string | null> {
  const db = useDB()
  const row = await db.query.caseStudies.findFirst({
    where: eq(caseStudies.id, id),
    with: { solution: { columns: { id: true, title: true } } },
  })
  if (!row || row.status !== 'approved' || row.isSpam) return null

  const point = row.location as { x: number, y: number } | null
  const lines: string[] = [`# Case study #${row.id}`, '']
  lines.push(`**Solution:** [${row.solution?.title ?? `#${row.solutionId}`}](${CANONICAL_BASE}/issue/${row.solutionId})`, '')
  lines.push(`**Outcome:** ${row.outcome}${row.verified ? ' · verified' : ''}`)
  const coords = point ? ` (${point.y.toFixed(4)}, ${point.x.toFixed(4)})` : ''
  const scale = row.scale ? ` · scale: ${row.scale}` : ''
  lines.push(`**Location:** ${row.locationName}${coords}${scale}`)
  if (row.implementer) lines.push(`**Implementer:** ${row.implementer}`)
  if (row.startDate) lines.push(`**Period:** ${row.startDate}${row.endDate ? ` → ${row.endDate}` : ''}`)
  if (row.cost) lines.push(`**Cost:** ${row.cost}${row.currency ? ` ${row.currency}` : ''}${row.fundingSource ? ` (${row.fundingSource})` : ''}`)
  lines.push('')
  if (row.description) lines.push(row.description, '')
  if (row.metrics?.length) {
    lines.push('## Metrics', '', ...row.metrics.map(m => `- **${m.label}**: ${m.baseline ?? '–'} → ${m.result ?? '–'}${m.unit ? ` ${m.unit}` : ''}`), '')
  }
  if (row.lessonsLearned?.length) {
    lines.push('## Lessons learned', '', ...row.lessonsLearned.map(l => `- ${l}`), '')
  }
  if (row.sources?.length) {
    lines.push('## Sources', '', ...row.sources.map(s => `- [${s.title ?? s.url}](${s.url})`), '')
  }
  if (row.links?.length) {
    lines.push('## Links', '', ...row.links.map(s => `- [${s.title ?? s.url}](${s.url})`), '')
  }
  lines.push('---', '', `Canonical: ${CANONICAL_BASE}/case-study/${row.id}`)
  return lines.join('\n')
}
