// Shared write-side logic for issues. Both /api/issue/index.post.ts (REST)
// and the MCP create_issue tool call into here so input sanitization,
// counter bumps, and the moderation trigger stay in one place.
import { eq, sql } from 'drizzle-orm'
import { issues } from '../database/schema'
import type { IssueType, LocationScale, SolutionStatus } from '../database/schema'
import { assertNotBanned } from './check-ban'

// Summary doubles as the card snippet — markdown there ships as literal
// `**bold**` to the viewer. Strip the formatting (and clamp length) so the
// column is plaintext at rest.
export const SUMMARY_MAX_LEN = 280

export function sanitizeSummary(input: string): string {
  let s = input.replace(/\r/g, '').trim()
  // Strip the formatting characters but keep the inner text.
  s = s
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
  // Collapse runs of whitespace to a single space — newlines belong in the
  // long-form description, not the card summary.
  s = s.replace(/\s+/g, ' ').trim()
  if (s.length > SUMMARY_MAX_LEN) {
    s = s.slice(0, SUMMARY_MAX_LEN - 1).trimEnd() + '…'
  }
  return s
}

export interface CreateIssueInput {
  title: string
  summary: string
  description?: string | null
  parentId?: number | null
  type?: IssueType
  locationName?: string | null
  latitude?: number | null
  longitude?: number | null
  scale?: LocationScale | null
}

export async function createIssue(authorId: string, input: CreateIssueInput) {
  const title = input.title?.trim()
  const summary = input.summary?.trim()
  if (!title) throw createError({ statusCode: 400, statusMessage: 'Title is required' })
  if (!summary) throw createError({ statusCode: 400, statusMessage: 'Summary is required' })

  await assertNotBanned(authorId)
  const db = useDB()

  if (input.parentId) {
    const parent = await db.query.issues.findFirst({
      where: eq(issues.id, input.parentId),
      columns: { id: true },
    })
    if (!parent) {
      throw createError({ statusCode: 404, statusMessage: 'Parent issue not found' })
    }
  }

  const type: IssueType = input.parentId ? (input.type ?? 'issue') : 'issue'

  const rows = await db.insert(issues).values({
    title,
    summary: sanitizeSummary(summary),
    description: input.description?.toString().trim() || null,
    parentId: input.parentId ?? null,
    authorId,
    type,
    locationName: input.locationName?.toString().trim() || null,
    location: (input.latitude != null && input.longitude != null)
      ? { x: input.longitude, y: input.latitude }
      : null,
    scale: input.scale ?? null,
  }).returning()
  const created = rows[0]!

  if (input.parentId) {
    const counter = type === 'solution'
      ? { solutionCount: sql`${issues.solutionCount} + 1` }
      : { subIssueCount: sql`${issues.subIssueCount} + 1` }
    await db.update(issues).set(counter).where(eq(issues.id, input.parentId))
  }

  return created
}

export interface UpdateIssueInput {
  id: number
  title?: string
  summary?: string
  description?: string | null
  solutionStatus?: SolutionStatus | null
  locationName?: string | null
  latitude?: number | null
  longitude?: number | null
  scale?: LocationScale | null
}

export async function updateIssue(authorId: string, input: UpdateIssueInput, expectedType?: IssueType) {
  const db = useDB()
  const existing = await db.query.issues.findFirst({ where: eq(issues.id, input.id) })
  if (!existing) throw createError({ statusCode: 404, statusMessage: `Issue ${input.id} not found` })
  if (expectedType && existing.type !== expectedType) {
    throw createError({
      statusCode: 400,
      statusMessage: `Node ${input.id} is a ${existing.type} — use update_${existing.type} instead`,
    })
  }
  if (existing.authorId !== authorId) {
    throw createError({ statusCode: 403, statusMessage: 'Only the author can update this issue' })
  }
  await assertNotBanned(authorId)

  const patch: Partial<typeof issues.$inferInsert> = { updatedAt: new Date() }
  if (input.title != null) patch.title = input.title.trim()
  if (input.summary != null) patch.summary = sanitizeSummary(input.summary)
  if (input.description !== undefined) {
    patch.description = input.description?.toString().trim() || null
  }
  if (input.solutionStatus !== undefined && existing.type === 'solution') {
    patch.solutionStatus = input.solutionStatus
  }
  if (input.locationName !== undefined) patch.locationName = input.locationName?.toString().trim() || null
  if (input.scale !== undefined) patch.scale = input.scale
  if (input.latitude !== undefined || input.longitude !== undefined) {
    const lat = input.latitude ?? (existing.location as { y: number } | null)?.y
    const lng = input.longitude ?? (existing.location as { x: number } | null)?.x
    patch.location = (lat != null && lng != null) ? { x: lng, y: lat } : null
  }

  // Content edits send the row back through moderation.
  const contentChanged = (patch.title && patch.title !== existing.title)
    || (patch.summary && patch.summary !== existing.summary)
    || (patch.description !== undefined && patch.description !== existing.description)
  if (contentChanged) {
    patch.status = 'pending'
    patch.rejectionReason = null
    patch.rejectedAt = null
  }

  const rows = await db.update(issues).set(patch).where(eq(issues.id, input.id)).returning()
  return { issue: rows[0]!, contentChanged }
}
