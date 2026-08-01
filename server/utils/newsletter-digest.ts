// Digest assembly for the newsletter. Splits into two layers so the send
// loop stays cheap: `buildRunContext` computes everything that is identical
// for every recipient once per cron run (good news, help wanted, product
// updates, the pool of recent wanted skills), `buildUserDigest` then adds the
// per-user sections (interest matches via pgvector, skill matches via text
// match against the shared pool) and filters down to the blocks the user
// opted into. Templates live in newsletter-email.ts.
import { and, desc, eq, gte, sql } from 'drizzle-orm'
import {
  caseStudies,
  issues,
  qualifications,
  userInterests,
  wantedSkills,
  type NewsletterContent,
} from '../database/schema'
import { findSimilar } from './embeddings'
import { PRODUCT_UPDATES } from './newsletter-updates'

export const NEWSLETTER_BASE_URL = 'https://communityfix.org'

const SECTION_LIMIT = 5
// Interest → issue similarity floor. Above the case-study search floor (0.2)
// because an email match should be clearly on-topic, not merely adjacent.
const INTEREST_SIMILARITY_THRESHOLD = 0.3
// Skill/qualification strings shorter than this never text-match — two-letter
// areas like "IT" would substring-match half the catalog.
const MIN_SKILL_MATCH_LENGTH = 4

export interface DigestItem {
  title: string
  url: string
  summary?: string
  /** Small muted line under the summary, e.g. `Rotterdam, NL · success`. */
  meta?: string
}

export interface DigestSection {
  key: keyof NewsletterContent
  title: string
  items: DigestItem[]
  footerLink?: { label: string; url: string }
}

/** Everything shared across recipients of one send run. */
export interface DigestRunContext {
  since: Date
  goodNews: DigestItem[]
  helpWanted: DigestItem[]
  productUpdates: DigestItem[]
  recentWantedSkills: Array<{
    skill: string
    issueId: number
    title: string
    summary: string
  }>
}

function truncate(s: string, max = 180): string {
  if (s.length <= max) return s
  const cut = s.slice(0, max)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20))}…`
}

function issueUrl(id: number): string {
  return `${NEWSLETTER_BASE_URL}/issue/${id}`
}

async function loadGoodNews(since: Date): Promise<DigestItem[]> {
  const rows = await useDB().query.caseStudies.findMany({
    where: and(
      eq(caseStudies.status, 'approved'),
      eq(caseStudies.outcome, 'success'),
      gte(caseStudies.createdAt, since),
    ),
    orderBy: [desc(caseStudies.verified), desc(caseStudies.createdAt)],
    limit: SECTION_LIMIT,
  })
  return rows.map((cs) => ({
    title: cs.title,
    url: `${NEWSLETTER_BASE_URL}/case-study/${cs.id}`,
    summary: cs.description ? truncate(cs.description) : undefined,
    meta: [cs.locationName, cs.implementer, cs.verified ? 'verified' : undefined]
      .filter(Boolean)
      .join(' · '),
  }))
}

async function loadHelpWanted(since: Date): Promise<DigestItem[]> {
  const rows = await useDB().query.issues.findMany({
    where: and(
      eq(issues.status, 'approved'),
      gte(issues.updatedAt, since),
      sql`cardinality(${issues.helpLabels}) > 0`,
    ),
    columns: { id: true, title: true, summary: true, helpLabels: true, type: true },
    orderBy: desc(issues.voteScore),
    limit: SECTION_LIMIT,
  })
  return rows.map((i) => ({
    title: i.title,
    url: issueUrl(i.id),
    summary: truncate(i.summary),
    meta: [i.type, ...i.helpLabels.map((l) => l.replace(/-/g, ' '))].join(' · '),
  }))
}

function loadProductUpdates(since: Date): DigestItem[] {
  return PRODUCT_UPDATES.filter((u) => new Date(`${u.date}T00:00:00Z`) >= since)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, SECTION_LIMIT)
    .map((u) => ({ title: u.title, url: u.url ?? NEWSLETTER_BASE_URL, summary: u.blurb }))
}

async function loadRecentWantedSkills(
  since: Date,
): Promise<DigestRunContext['recentWantedSkills']> {
  const rows = await useDB()
    .select({
      skill: wantedSkills.skill,
      issueId: issues.id,
      title: issues.title,
      summary: issues.summary,
    })
    .from(wantedSkills)
    .innerJoin(issues, eq(issues.id, wantedSkills.issueId))
    .where(and(eq(issues.status, 'approved'), gte(wantedSkills.createdAt, since)))
  return rows
}

export async function buildRunContext(windowDays: number): Promise<DigestRunContext> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
  const [goodNews, helpWanted, recentWantedSkills] = await Promise.all([
    loadGoodNews(since),
    loadHelpWanted(since),
    loadRecentWantedSkills(since),
  ])
  return {
    since,
    goodNews,
    helpWanted,
    productUpdates: loadProductUpdates(since),
    recentWantedSkills,
  }
}

// ── Per-user sections ────────────────────────────────────────────────

type InterestHit = { id: number; title: string; summary: string; similarity: number }

async function matchInterests(userId: string, since: Date): Promise<DigestItem[]> {
  const interests = await useDB().query.userInterests.findMany({
    where: and(eq(userInterests.userId, userId), sql`${userInterests.embedding} IS NOT NULL`),
    orderBy: desc(userInterests.createdAt),
    limit: 10,
  })

  // Best similarity per issue across all interests, remembering which
  // interest label produced the match for the meta line.
  const best = new Map<number, InterestHit & { label: string }>()
  for (const interest of interests) {
    const hits = await findSimilar<InterestHit>({
      table: 'issues',
      columns: 'id, title, summary',
      embedding: interest.embedding!,
      where: sql`status = 'approved' AND created_at >= ${since}`,
      limit: SECTION_LIMIT,
      threshold: INTEREST_SIMILARITY_THRESHOLD,
    })
    for (const hit of hits) {
      const prev = best.get(hit.id)
      if (!prev || hit.similarity > prev.similarity) {
        best.set(hit.id, { ...hit, label: interest.label })
      }
    }
  }

  return [...best.values()]
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, SECTION_LIMIT)
    .map((hit) => ({
      title: hit.title,
      url: issueUrl(hit.id),
      summary: truncate(hit.summary),
      meta: `matches “${hit.label}”`,
    }))
}

// Case-insensitive containment in either direction between what the user can
// do and what the node asks for. Crude next to the embedding path above, but
// wanted skills and qualification areas are short noun phrases where
// containment ("civil engineering" ⊂ "senior civil engineering") does most of
// the work an embedding would.
function skillsOverlap(wanted: string, offered: string): boolean {
  const w = wanted.trim().toLowerCase()
  const o = offered.trim().toLowerCase()
  if (w.length < MIN_SKILL_MATCH_LENGTH || o.length < MIN_SKILL_MATCH_LENGTH) return false
  return w.includes(o) || o.includes(w)
}

async function matchSkills(
  userId: string,
  pool: DigestRunContext['recentWantedSkills'],
): Promise<DigestItem[]> {
  if (pool.length === 0) return []
  const quals = await useDB().query.qualifications.findMany({
    where: eq(qualifications.userId, userId),
    columns: { title: true, area: true },
  })
  if (quals.length === 0) return []

  const offered = quals.flatMap((q) => [q.area, q.title])
  const byIssue = new Map<number, { item: DigestItem; skills: string[] }>()
  for (const ws of pool) {
    if (!offered.some((o) => skillsOverlap(ws.skill, o))) continue
    const entry = byIssue.get(ws.issueId)
    if (entry) {
      entry.skills.push(ws.skill)
    } else {
      byIssue.set(ws.issueId, {
        item: { title: ws.title, url: issueUrl(ws.issueId), summary: truncate(ws.summary) },
        skills: [ws.skill],
      })
    }
  }

  return [...byIssue.values()].slice(0, SECTION_LIMIT).map(({ item, skills }) => ({
    ...item,
    meta: `looking for ${skills.join(', ')}`,
  }))
}

/**
 * Sections for one recipient, personal blocks first, already filtered to the
 * blocks they opted into and to sections that actually have items. An empty
 * return means "send nothing".
 */
export async function buildUserDigest(
  ctx: DigestRunContext,
  userId: string,
  content: NewsletterContent,
): Promise<DigestSection[]> {
  const sections: DigestSection[] = []

  if (content.topicMatches) {
    sections.push({
      key: 'topicMatches',
      title: 'New in your interests',
      items: await matchInterests(userId, ctx.since),
    })
  }
  if (content.skillMatches) {
    sections.push({
      key: 'skillMatches',
      title: 'Your skills are wanted',
      items: await matchSkills(userId, ctx.recentWantedSkills),
    })
  }
  if (content.goodNews) {
    sections.push({ key: 'goodNews', title: 'Good news', items: ctx.goodNews })
  }
  if (content.helpWanted) {
    sections.push({
      key: 'helpWanted',
      title: 'Help wanted',
      items: ctx.helpWanted,
      footerLink: {
        label: 'See everything that needs a hand',
        url: `${NEWSLETTER_BASE_URL}/contribute`,
      },
    })
  }
  if (content.productUpdates) {
    sections.push({ key: 'productUpdates', title: 'Product updates', items: ctx.productUpdates })
  }

  return sections.filter((s) => s.items.length > 0)
}
