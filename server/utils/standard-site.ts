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
  createAtpRecord,
  createAtpSession,
  deleteAtpRecord,
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

// CommunityFix brand color (Tailwind `blue-500`, the UI `primary`) expressed as
// site.standard.theme.color#rgb for the publication's basicTheme (point 2).
const RGB = {
  background: { r: 255, g: 255, b: 255 },
  foreground: { r: 17, g: 24, b: 39 }, // gray-900
  accent: { r: 59, g: 130, b: 246 }, // blue-500
  accentForeground: { r: 255, g: 255, b: 255 },
}

interface BasicTheme {
  background: { r: number, g: number, b: number }
  foreground: { r: number, g: number, b: number }
  accent: { r: number, g: number, b: number }
  accentForeground: { r: number, g: number, b: number }
}

function buildBasicTheme(): BasicTheme {
  return { background: RGB.background, foreground: RGB.foreground, accent: RGB.accent, accentForeground: RGB.accentForeground }
}

interface PublicationRecord {
  $type: typeof PUBLICATION_NSID
  url: string
  name: string
  description?: string
  icon?: BlobRef
  basicTheme: BasicTheme
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
    basicTheme: buildBasicTheme(),
    preferences: { showInDiscover: true },
    createdAt,
  }
}

interface Contributor {
  did: string
  displayName?: string
  role?: string
}

// CommunityFix-specific structure carried in the document `content` open union
// (point 3). Aggregators that don't understand it ignore it; ours (and any
// curious indexer) can read the tree linkage and SDG mapping back out.
interface CommunityFixContent {
  $type: 'org.communityfix.content'
  kind: StandardSiteRefKind
  nodeId: number
  parentId?: number | null
  sdgs?: number[]
}

interface DocumentRecord {
  $type: typeof DOCUMENT_NSID
  site: string
  path: string
  title: string
  description?: string
  textContent?: string
  tags?: string[]
  contributors?: Contributor[]
  content?: CommunityFixContent
  publishedAt: string
  updatedAt?: string
}

interface DocumentSource {
  path: string
  title: string
  description?: string
  textContent?: string
  tags?: string[]
  contributors?: Contributor[]
  content?: CommunityFixContent
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
    ...(src.contributors?.length ? { contributors: src.contributors } : {}),
    ...(src.content ? { content: src.content } : {}),
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

// Workers can fail mid-write; retry transient PDS errors a few times with
// backoff. swapRecord/swapCommit conflicts are NOT retried blindly — they mean
// our cached CID is stale, which the next full reconcile will repair.
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    }
    catch (err) {
      lastErr = err
      if (err instanceof Error && /swap|conflict|RecordNotFound/i.test(err.message)) throw err
      if (i < attempts - 1) await new Promise(r => setTimeout(r, 200 * 2 ** i))
    }
  }
  throw lastErr
}

interface UpsertTarget {
  collection: string
  refKind: StandardSiteRefKind
  refId: number | null
  record: Record<string, unknown>
}

/**
 * Publish a record to the PDS and mirror it into Postgres. First publish uses
 * createRecord (PDS may assign the rkey); updates reuse the stored rkey via
 * putRecord guarded by the last known CID. Skips the network round-trip when
 * the content hash is unchanged. Returns the record's AT-URI.
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

  if (existing) {
    const result = await withRetry(() =>
      putAtpRecord(session, target.collection, existing.rkey, target.record, existing.cid))
    await db.update(standardSiteRecords)
      .set({ uri: result.uri, cid: result.cid, contentHash: hash, updatedAt: new Date() })
      .where(eq(standardSiteRecords.id, existing.id))
    return { uri: result.uri, changed: true }
  }

  const rkey = generateTid()
  const result = await withRetry(() => createAtpRecord(session, target.collection, target.record, rkey))
  await db.insert(standardSiteRecords).values({
    collection: target.collection,
    refKind: target.refKind,
    refId: target.refId,
    uri: result.uri,
    rkey,
    cid: result.cid,
    contentHash: hash,
  })
  return { uri: result.uri, changed: true }
}

/**
 * Remove the document record for a node from the PDS and drop its mapping row.
 * Idempotent — a no-op when nothing is mirrored. Used when a node becomes
 * unpublishable (rejected, spam, publish flag cleared, or deleted).
 */
async function deleteRecordFor(session: AtpSession, refKind: StandardSiteRefKind, refId: number): Promise<boolean> {
  const db = useDB()
  const existing = await db.query.standardSiteRecords.findFirst({
    where: and(eq(standardSiteRecords.refKind, refKind), eq(standardSiteRecords.refId, refId)),
  })
  if (!existing) return false
  await withRetry(() => deleteAtpRecord(session, existing.collection, existing.rkey))
  await db.delete(standardSiteRecords).where(eq(standardSiteRecords.id, existing.id))
  return true
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

// --- Document source builders (shared by per-node + batch paths) ------------

type IssueRow = NonNullable<Awaited<ReturnType<typeof loadIssue>>>
type CaseStudyRow = NonNullable<Awaited<ReturnType<typeof loadCaseStudy>>>

function loadIssue(id: number) {
  return useDB().query.issues.findFirst({
    where: eq(issues.id, id),
    with: { ...issueWithRelations, author: { columns: { name: true, atprotoDid: true } } },
  })
}

function loadCaseStudy(id: number) {
  return useDB().query.caseStudies.findFirst({
    where: eq(caseStudies.id, id),
    with: { solution: { columns: { title: true } }, author: { columns: { name: true, atprotoDid: true } } },
  })
}

/** A node is publishable as a document iff approved, not spam, and opted in. */
function issuePublishable(row: { status: string, isSpam: boolean, publishToStandardSite: boolean }): boolean {
  return row.status === 'approved' && !row.isSpam && row.publishToStandardSite
}

function contributorFromAuthor(author: { name: string | null, atprotoDid: string | null } | null | undefined): Contributor[] | undefined {
  // Only civic users who have linked a real DID can be listed; others are
  // attributed in our own DB only (the document omits them).
  if (!author?.atprotoDid) return undefined
  return [{ did: author.atprotoDid, ...(author.name ? { displayName: author.name } : {}) }]
}

function issueDocumentSource(row: IssueRow): DocumentSource {
  const t = transformIssue(row)
  const description = toPlainText(t.description) || t.summary
  return {
    path: `/issue/${t.id}`,
    title: t.title,
    description: t.summary,
    textContent: clampGraphemes(`${t.summary}\n\n${description}`.trim(), 30000),
    tags: t.tags,
    contributors: contributorFromAuthor(row.author),
    content: {
      $type: 'org.communityfix.content',
      kind: t.type === 'solution' ? 'solution' : 'issue',
      nodeId: t.id,
      parentId: t.parentId,
      ...(t.sustainableDevelopmentGoals.length ? { sdgs: t.sustainableDevelopmentGoals.map(s => s.id) } : {}),
    },
    publishedAt: (row.createdAt ?? new Date()).toISOString(),
    updatedAt: row.updatedAt?.toISOString(),
  }
}

function caseStudyDocumentSource(row: CaseStudyRow): DocumentSource {
  const description = toPlainText(row.description)
    || `Real-world implementation of "${row.solution?.title ?? 'a solution'}" in ${row.locationName} (${row.outcome}).`
  return {
    path: `/case-study/${row.id}`,
    title: `Case study: ${row.locationName}`,
    description: clampGraphemes(description, 3000),
    textContent: clampGraphemes(description, 30000),
    contributors: contributorFromAuthor(row.author),
    content: { $type: 'org.communityfix.content', kind: 'case_study', nodeId: row.id, parentId: row.solutionId },
    publishedAt: (row.createdAt ?? new Date()).toISOString(),
    updatedAt: row.updatedAt?.toISOString(),
  }
}

// --- Per-node reconcile (point 5: mirror create/update/delete) --------------

/** The publication AT-URI, ensuring it exists first. Returns null if unpublished. */
async function ensureSiteUri(session: AtpSession): Promise<string | null> {
  const uri = await getPublicationUri()
  if (uri) return uri
  // Publication not yet created — bootstrap it so documents have a `site`.
  const report = await publishPublication(session)
  return report
}

/**
 * Mirror a single CommunityFix node to its standard.site document record:
 * publish/update when it's publishable, delete when it isn't. Called from the
 * write-side hooks on create/update/approve/reject/delete. Idempotent and
 * resilient — never throws into the caller's request path; returns the action
 * taken (or 'skipped' when atproto isn't configured).
 *
 * `gone: true` forces deletion regardless of row state (used for hard deletes
 * where the row may already be gone).
 */
export async function reconcileNode(
  refKind: Exclude<StandardSiteRefKind, 'publication'>,
  refId: number,
  opts: { gone?: boolean } = {},
): Promise<'published' | 'updated' | 'unchanged' | 'deleted' | 'noop' | 'skipped'> {
  if (!isAtprotoConfigured()) return 'skipped'
  const session = await createAtpSession()
  if (!session) return 'skipped'

  // Deletion path.
  if (opts.gone) {
    const removed = await deleteRecordFor(session, refKind, refId)
    return removed ? 'deleted' : 'noop'
  }

  if (refKind === 'case_study') {
    const row = await loadCaseStudy(refId)
    if (!row || !issuePublishable(row)) {
      const removed = await deleteRecordFor(session, refKind, refId)
      return removed ? 'deleted' : 'noop'
    }
    const site = await ensureSiteUri(session)
    if (!site) return 'noop'
    const before = await getDocumentUri(refKind, refId)
    await upsertRecord(session, {
      collection: DOCUMENT_NSID,
      refKind,
      refId,
      record: buildDocumentRecord(site, caseStudyDocumentSource(row)) as unknown as Record<string, unknown>,
    })
    return before ? 'updated' : 'published'
  }

  // issue / solution
  const row = await loadIssue(refId)
  if (!row || !issuePublishable(row)) {
    const removed = await deleteRecordFor(session, refKind, refId)
    return removed ? 'deleted' : 'noop'
  }
  // The row's actual kind must match the requested refKind (issue vs solution).
  const actualKind: StandardSiteRefKind = row.type === 'solution' ? 'solution' : 'issue'
  if (actualKind !== refKind) {
    // Kind changed (rare admin reclassification) — drop the stale record.
    await deleteRecordFor(session, refKind, refId)
  }
  const site = await ensureSiteUri(session)
  if (!site) return 'noop'
  const before = await getDocumentUri(actualKind, refId)
  await upsertRecord(session, {
    collection: DOCUMENT_NSID,
    refKind: actualKind,
    refId,
    record: buildDocumentRecord(site, issueDocumentSource(row)) as unknown as Record<string, unknown>,
  })
  return before ? 'updated' : 'published'
}

/**
 * Fire-and-forget wrapper for the request path. Logs and swallows errors so a
 * PDS hiccup never breaks the user's create/update/approve action — the daily
 * `sync:standard-site` task is the backstop that repairs any drift.
 */
export function reconcileNodeInBackground(
  refKind: Exclude<StandardSiteRefKind, 'publication'>,
  refId: number,
  opts: { gone?: boolean } = {},
): void {
  if (!isAtprotoConfigured()) return
  reconcileNode(refKind, refId, opts).catch((err) => {
    console.error(`[standard-site] reconcile ${refKind}:${refId} failed:`, err)
  })
}

export interface SyncReport {
  skipped: boolean
  publicationUri: string | null
  documentsPublished: number
  documentsUnchanged: number
  failures: Array<{ ref: string, error: string }>
}

/**
 * Publish (or update) the singleton publication record. Preserves the original
 * createdAt and the previously uploaded icon blob across updates. Returns the
 * publication AT-URI, or null on failure.
 */
async function publishPublication(session: AtpSession): Promise<string | null> {
  const db = useDB()
  const pubRow = await db.query.standardSiteRecords.findFirst({
    where: and(eq(standardSiteRecords.refKind, 'publication'), isNull(standardSiteRecords.refId)),
  })
  const pubCreatedAt = pubRow?.createdAt?.toISOString() ?? new Date().toISOString()

  // Only upload the icon on first publish — re-uploading every run churns blobs.
  const icon = pubRow ? undefined : await fetchPublicationIcon(session)
  // On update, carry the already-published icon ref so we don't drop it.
  let existingIcon: BlobRef | undefined
  if (pubRow) {
    const current = await getAtpRecord(session, PUBLICATION_NSID, pubRow.rkey)
    const ic = current?.value?.icon as BlobRef | undefined
    if (ic && ic.$type === 'blob') existingIcon = ic
  }

  const record = buildPublicationRecord(icon ?? existingIcon, pubCreatedAt)
  const { uri } = await upsertRecord(session, {
    collection: PUBLICATION_NSID,
    refKind: 'publication',
    refId: null,
    record: record as unknown as Record<string, unknown>,
  })
  return uri
}

/**
 * Full reconcile: publish the publication record, then converge every
 * publishable issue/solution/case study to a document record and prune records
 * for nodes that are no longer publishable. Idempotent — safe on a schedule and
 * the backstop that repairs any drift left by failed per-node writes. No-ops
 * when atproto credentials are absent.
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

  // 1. Publication (singleton). Without it documents have nothing to point at.
  try {
    report.publicationUri = await publishPublication(session)
  }
  catch (err) {
    report.failures.push({ ref: 'publication', error: err instanceof Error ? err.message : String(err) })
    return report
  }
  const site = report.publicationUri ?? CANONICAL_BASE

  // 2. Issues + solutions — only the publishable ones.
  const allIssues = await db.query.issues.findMany({
    where: and(eq(issues.status, 'approved'), ne(issues.isSpam, true), eq(issues.publishToStandardSite, true)),
    with: { ...issueWithRelations, author: { columns: { name: true, atprotoDid: true } } },
    orderBy: desc(issues.createdAt),
  })

  for (const row of allIssues) {
    const refKind: StandardSiteRefKind = row.type === 'solution' ? 'solution' : 'issue'
    try {
      const { changed } = await upsertRecord(session, {
        collection: DOCUMENT_NSID,
        refKind,
        refId: row.id,
        record: buildDocumentRecord(site, issueDocumentSource(row)) as unknown as Record<string, unknown>,
      })
      if (changed) report.documentsPublished++
      else report.documentsUnchanged++
    }
    catch (err) {
      report.failures.push({ ref: `${refKind}:${row.id}`, error: err instanceof Error ? err.message : String(err) })
    }
  }

  // 3. Case studies — only the publishable ones.
  const studies = await db.query.caseStudies.findMany({
    where: and(eq(caseStudies.status, 'approved'), ne(caseStudies.isSpam, true), eq(caseStudies.publishToStandardSite, true)),
    with: { solution: { columns: { title: true } }, author: { columns: { name: true, atprotoDid: true } } },
    orderBy: desc(caseStudies.createdAt),
  })

  for (const cs of studies) {
    try {
      const { changed } = await upsertRecord(session, {
        collection: DOCUMENT_NSID,
        refKind: 'case_study',
        refId: cs.id,
        record: buildDocumentRecord(site, caseStudyDocumentSource(cs)) as unknown as Record<string, unknown>,
      })
      if (changed) report.documentsPublished++
      else report.documentsUnchanged++
    }
    catch (err) {
      report.failures.push({ ref: `case_study:${cs.id}`, error: err instanceof Error ? err.message : String(err) })
    }
  }

  // 4. Prune: delete any mirrored document whose node is no longer publishable
  // (rejected, spammed, opted out, or deleted). Compares the mapping table to
  // the set we just (re)published above.
  const liveIssueIds = new Set(allIssues.map(r => r.id))
  const liveStudyIds = new Set(studies.map(r => r.id))
  const mapped = await db.query.standardSiteRecords.findMany({
    where: ne(standardSiteRecords.refKind, 'publication'),
    columns: { refKind: true, refId: true },
  })
  for (const m of mapped) {
    if (m.refId == null) continue
    const stillLive = m.refKind === 'case_study' ? liveStudyIds.has(m.refId) : liveIssueIds.has(m.refId)
    if (stillLive) continue
    try {
      const removed = await deleteRecordFor(session, m.refKind, m.refId)
      if (removed) report.documentsPublished++ // count as a change
    }
    catch (err) {
      report.failures.push({ ref: `delete ${m.refKind}:${m.refId}`, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return report
}
