// Shared write-side logic for issues. Both /api/issue/index.post.ts (REST)
// and the MCP create_issue tool call into here so input sanitization,
// counter bumps, and the moderation trigger stay in one place.
import { eq, sql } from 'drizzle-orm'
import { issues, users } from '../database/schema'
import type { IssueType, LocationScale, SolutionStatus } from '../database/schema'
import { assertNotBanned } from './check-ban'
import { isAdminEmail } from './admin'

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

export type Link = { url: string, title?: string }

export function sanitizeLinks(input: unknown): Link[] | null {
  if (!Array.isArray(input)) return null
  const cleaned = input
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null
      const url = String((raw as { url?: unknown }).url ?? '').trim()
      if (!url) return null
      const title = String((raw as { title?: unknown }).title ?? '').trim()
      return title ? { url, title } : { url }
    })
    .filter((l): l is Link => l !== null)
  return cleaned.length ? cleaned : null
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
  // Honored only for solutions.
  links?: Link[] | null
}

export async function createIssue(authorId: string, input: CreateIssueInput) {
  const title = input.title?.trim()
  const summary = input.summary?.trim()
  if (!title) throw createError({ statusCode: 400, statusMessage: 'Title is required' })
  if (!summary) throw createError({ statusCode: 400, statusMessage: 'Summary is required' })

  await assertNotBanned(authorId)
  const db = useDB()

  let parentType: IssueType | null = null
  if (input.parentId) {
    const parent = await db.query.issues.findFirst({
      where: eq(issues.id, input.parentId),
      columns: { id: true, type: true },
    })
    if (!parent) {
      throw createError({ statusCode: 404, statusMessage: 'Parent issue not found' })
    }
    parentType = parent.type
  }

  const type: IssueType = input.parentId ? (input.type ?? 'issue') : 'issue'

  // Solutions document an approach to an issue — nesting a solution under
  // another solution doesn't fit that model. To document a concrete
  // implementation of a solution, create a case study instead.
  if (type === 'solution' && parentType === 'solution') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Solutions cannot be nested under other solutions. Create a case study to document a concrete implementation.',
    })
  }

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
    links: type === 'solution' ? sanitizeLinks(input.links) : null,
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
  // Honored only when the target row is a solution.
  links?: Link[] | null
}

export async function updateIssue(userId: string, input: UpdateIssueInput, expectedType?: IssueType) {
  const db = useDB()
  const existing = await db.query.issues.findFirst({ where: eq(issues.id, input.id) })
  if (!existing) throw createError({ statusCode: 404, statusMessage: `Issue ${input.id} not found` })
  if (expectedType && existing.type !== expectedType) {
    throw createError({
      statusCode: 400,
      statusMessage: `Node ${input.id} is a ${existing.type} — use update_${existing.type} instead`,
    })
  }

  // Admins can edit anyone's content (moderation, fixups). The author's own
  // edit still goes through the ban check; admin edits skip it.
  const me = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { email: true } })
  const isAdmin = isAdminEmail(me?.email)
  if (existing.authorId !== userId && !isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Only the author or an admin can update this issue' })
  }
  if (!isAdmin) await assertNotBanned(userId)

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
  if (input.links !== undefined && existing.type === 'solution') {
    patch.links = sanitizeLinks(input.links)
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
