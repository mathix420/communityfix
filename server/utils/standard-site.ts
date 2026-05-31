// standard.site (https://standard.site) domain logic.
//
// standard.site defines shared AT Protocol lexicons for long-form publishing so
// content is discoverable and portable across the ATmosphere. CommunityFix maps:
//   - the whole site            → one `site.standard.publication` record
//   - each approved issue        → a `site.standard.document` record
//   - each approved solution     → a `site.standard.document` record
//   - each approved case study   → a `site.standard.document` record
//
// This module builds those record bodies, publishes them to the configured PDS
// (idempotently, skipping unchanged content), and mirrors the resulting AT-URIs
// into `standard_site_records` so the web-verification layer can resolve them
// from Postgres. It no-ops cleanly when atproto credentials are not configured.

import { and, desc, eq, isNull, ne } from 'drizzle-orm'
import { caseStudies, issues, standardSiteRecords, type StandardSiteRefKind } from '../database/schema'
import { issueWithRelations, transformIssue } from './transform-issue'
import {
  createAtpSession,
  generateTid,
  getAtpRecord,
  isAtprotoConfigured,
  putAtpRecord,
  uploadAtpBlob,
  type AtpSession,
  type BlobRef,
} from './atproto'

export const CANONICAL_BASE = 'https://communityfix.org'
export const PUBLICATION_NSID = 'site.standard.publication'
export const DOCUMENT_NSID = 'site.standard.document'

const PUBLICATION_NAME = 'CommunityFix'
const PUBLICATION_DESCRIPTION
  = 'A public tree of community issues and solutions, with real-world case studies. '
    + 'Discover problems worth solving, proposed approaches, and where they have been tried.'
// Square icon used for the publication record. Served from /public.
const PUBLICATION_ICON_URL = `${CANONICAL_BASE}/web-app-manifest-192x192.png`

// ---------------------------------------------------------------------------
// Record builders
// ---------------------------------------------------------------------------

/** Strip markdown to a plaintext approximation for the document `textContent`. */
function toPlainText(markdown: string | null | undefined): string {
  if (!markdown) return ''
  return markdown
    .replace(/```[\s\S]*?```/g, ' ') // fenced code
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → text
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/[*_~>#-]/g, ' ') // residual markdown punctuation
    .replace(/\s+/g, ' ')
    .trim()
}

/** Clamp by graphemes-ish (code points) to satisfy lexicon maxGraphemes limits. */
function clampGraphemes(s: string, max: number): string {
  const chars = [...s]
  if (chars.length <= max) return s
  return chars.slice(0, max - 1).join('') + '…'
}

interface PublicationRecord {
  $type: typeof PUBLICATION_NSID
  url: string
  name: string
  description?: string
  icon?: BlobRef
  preferences?: Record<string, unknown>
  createdAt: string
}

function buildPublicationRecord(icon: BlobRef | undefined, createdAt: string): PublicationRecord {
  return {
    $type: PUBLICATION_NSID,
    url: CANONICAL_BASE,
    name: PUBLICATION_NAME,
    description: clampGraphemes(PUBLICATION_DESCRIPTION, 3000),
    ...(icon ? { icon } : {}),
    preferences: { showInDiscover: true },
    createdAt,
  }
}

interface DocumentRecord {
  $type: typeof DOCUMENT_NSID
  site: string
  path: string
  title: string
  description?: string
  textContent?: string
  tags?: string[]
  publishedAt: string
  updatedAt?: string
}

interface DocumentSource {
  path: string
  title: string
  description?: string
  textContent?: string
  tags?: string[]
  publishedAt: string
  updatedAt?: string
}

function buildDocumentRecord(site: string, src: DocumentSource): DocumentRecord {
  return {
    $type: DOCUMENT_NSID,
    site,
    path: src.path,
    title: clampGraphemes(src.title, 500),
    ...(src.description ? { description: clampGraphemes(src.description, 3000) } : {}),
    ...(src.textContent ? { textContent: src.textContent } : {}),
    ...(src.tags?.length ? { tags: src.tags.map(t => clampGraphemes(t, 128)) } : {}),
    publishedAt: src.publishedAt,
    ...(src.updatedAt ? { updatedAt: src.updatedAt } : {}),
  }
}

// ---------------------------------------------------------------------------
// DB-backed URI lookups (used by the web-verification layer)
// ---------------------------------------------------------------------------

/** AT-URI of the publication record, or null if not published yet. */
export async function getPublicationUri(): Promise<string | null> {
  const row = await useDB().query.standardSiteRecords.findFirst({
    where: and(eq(standardSiteRecords.refKind, 'publication'), isNull(standardSiteRecords.refId)),
    columns: { uri: true },
  })
  return row?.uri ?? null
}

/** AT-URI of the document record mirroring a given content item, or null. */
export async function getDocumentUri(refKind: StandardSiteRefKind, refId: number): Promise<string | null> {
  const row = await useDB().query.standardSiteRecords.findFirst({
    where: and(eq(standardSiteRecords.refKind, refKind), eq(standardSiteRecords.refId, refId)),
    columns: { uri: true },
  })
  return row?.uri ?? null
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

interface UpsertTarget {
  collection: string
  refKind: StandardSiteRefKind
  refId: number | null
  record: Record<string, unknown>
}

/**
 * Publish a record to the PDS and mirror it into Postgres. Reuses the existing
 * rkey on update and skips the network round-trip when the content hash is
 * unchanged. Returns the record's AT-URI.
 */
async function upsertRecord(session: AtpSession, target: UpsertTarget): Promise<{ uri: string, changed: boolean }> {
  const db = useDB()
  const existing = await db.query.standardSiteRecords.findFirst({
    where: target.refId === null
      ? and(eq(standardSiteRecords.refKind, target.refKind), isNull(standardSiteRecords.refId))
      : and(eq(standardSiteRecords.refKind, target.refKind), eq(standardSiteRecords.refId, target.refId)),
  })

  const hash = await sha256Hex(JSON.stringify(target.record))
  if (existing && existing.contentHash === hash) {
    return { uri: existing.uri, changed: false }
  }

  const rkey = existing?.rkey ?? generateTid()
  const result = await putAtpRecord(session, target.collection, rkey, target.record, existing?.cid)

  if (existing) {
    await db.update(standardSiteRecords)
      .set({ uri: result.uri, cid: result.cid, contentHash: hash, updatedAt: new Date() })
      .where(eq(standardSiteRecords.id, existing.id))
  }
  else {
    await db.insert(standardSiteRecords).values({
      collection: target.collection,
      refKind: target.refKind,
      refId: target.refId,
      uri: result.uri,
      rkey,
      cid: result.cid,
      contentHash: hash,
    })
  }
  return { uri: result.uri, changed: true }
}

/** Upload the publication icon blob. Best-effort: returns undefined on failure. */
async function fetchPublicationIcon(session: AtpSession): Promise<BlobRef | undefined> {
  try {
    const res = await fetch(PUBLICATION_ICON_URL)
    if (!res.ok) return undefined
    const mimeType = res.headers.get('content-type') ?? 'image/png'
    const bytes = new Uint8Array(await res.arrayBuffer())
    if (bytes.byteLength === 0 || bytes.byteLength > 1_000_000) return undefined
    return await uploadAtpBlob(session, bytes, mimeType)
  }
  catch {
    return undefined
  }
}

export interface SyncReport {
  skipped: boolean
  publicationUri: string | null
  documentsPublished: number
  documentsUnchanged: number
  failures: Array<{ ref: string, error: string }>
}

/**
 * Publish the publication record plus a document record for every approved,
 * non-spam issue, solution and case study. Idempotent — safe to run on a
 * schedule. No-ops when atproto credentials are absent.
 */
export async function syncStandardSite(): Promise<SyncReport> {
  const report: SyncReport = {
    skipped: false,
    publicationUri: null,
    documentsPublished: 0,
    documentsUnchanged: 0,
    failures: [],
  }

  if (!isAtprotoConfigured()) {
    report.skipped = true
    return report
  }

  const session = await createAtpSession()
  if (!session) {
    report.skipped = true
    return report
  }

  const db = useDB()

  // 1. Publication record (singleton). Preserve the original createdAt across
  // updates so the record's birth time stays stable.
  const pubRow = await db.query.standardSiteRecords.findFirst({
    where: and(eq(standardSiteRecords.refKind, 'publication'), isNull(standardSiteRecords.refId)),
  })
  const pubCreatedAt = pubRow?.createdAt?.toISOString() ?? new Date().toISOString()

  // Only (re)upload the icon when the publication has not been published yet —
  // re-uploading on every run would churn blobs needlessly.
  const icon = pubRow ? undefined : await fetchPublicationIcon(session)
  // When updating an existing publication without re-uploading the icon, carry
  // the previously published icon ref so we don't drop it from the record.
  let existingIcon: BlobRef | undefined
  if (pubRow) {
    const current = await getAtpRecord(session, PUBLICATION_NSID, pubRow.rkey)
    const ic = current?.value?.icon as BlobRef | undefined
    if (ic && ic.$type === 'blob') existingIcon = ic
  }

  const publicationRecord = buildPublicationRecord(icon ?? existingIcon, pubCreatedAt)
  try {
    const { uri } = await upsertRecord(session, {
      collection: PUBLICATION_NSID,
      refKind: 'publication',
      refId: null,
      record: publicationRecord as unknown as Record<string, unknown>,
    })
    report.publicationUri = uri
  }
  catch (err) {
    report.failures.push({ ref: 'publication', error: err instanceof Error ? err.message : String(err) })
    // Without a publication the documents have nothing to point at — bail.
    return report
  }

  // The document `site` field points at the publication record by AT-URI.
  const site = report.publicationUri ?? CANONICAL_BASE

  // 2. Issues + solutions.
  const allIssues = await db.query.issues.findMany({
    where: and(eq(issues.status, 'approved'), ne(issues.isSpam, true)),
    with: issueWithRelations,
    orderBy: desc(issues.createdAt),
  })

  for (const row of allIssues) {
    const t = transformIssue(row)
    const refKind: StandardSiteRefKind = t.type === 'solution' ? 'solution' : 'issue'
    const description = toPlainText(t.description) || t.summary
    const src: DocumentSource = {
      path: `/issue/${t.id}`,
      title: t.title,
      description: t.summary,
      textContent: clampGraphemes(`${t.summary}\n\n${description}`.trim(), 30000),
      tags: t.tags,
      publishedAt: (row.createdAt ?? new Date()).toISOString(),
      updatedAt: row.updatedAt?.toISOString(),
    }
    try {
      const { changed } = await upsertRecord(session, {
        collection: DOCUMENT_NSID,
        refKind,
        refId: t.id,
        record: buildDocumentRecord(site, src) as unknown as Record<string, unknown>,
      })
      if (changed) report.documentsPublished++
      else report.documentsUnchanged++
    }
    catch (err) {
      report.failures.push({ ref: `${refKind}:${t.id}`, error: err instanceof Error ? err.message : String(err) })
    }
  }

  // 3. Case studies.
  const studies = await db.query.caseStudies.findMany({
    where: and(eq(caseStudies.status, 'approved'), ne(caseStudies.isSpam, true)),
    with: { solution: { columns: { title: true } } },
    orderBy: desc(caseStudies.createdAt),
  })

  for (const cs of studies) {
    const title = `Case study: ${cs.locationName}`
    const description = toPlainText(cs.description)
      || `Real-world implementation of "${cs.solution?.title ?? 'a solution'}" in ${cs.locationName} (${cs.outcome}).`
    const src: DocumentSource = {
      path: `/case-study/${cs.id}`,
      title,
      description: clampGraphemes(description, 3000),
      textContent: clampGraphemes(description, 30000),
      publishedAt: (cs.createdAt ?? new Date()).toISOString(),
      updatedAt: cs.updatedAt?.toISOString(),
    }
    try {
      const { changed } = await upsertRecord(session, {
        collection: DOCUMENT_NSID,
        refKind: 'case_study',
        refId: cs.id,
        record: buildDocumentRecord(site, src) as unknown as Record<string, unknown>,
      })
      if (changed) report.documentsPublished++
      else report.documentsUnchanged++
    }
    catch (err) {
      report.failures.push({ ref: `case_study:${cs.id}`, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return report
}
