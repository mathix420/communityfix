import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { issues } from '../database/schema'

// Parse a numeric route param, 400ing on anything non-numeric. `label` names
// the resource in the error message: requireIdParam(event, { label: 'skill',
// name: 'skillId' }) → "Invalid skill ID".
export function requireIdParam(
  event: H3Event,
  { name = 'id', label = 'issue' }: { name?: string; label?: string } = {},
): number {
  const raw = getRouterParam(event, name)
  if (!raw || isNaN(parseInt(raw, 10))) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${label} ID` })
  }
  return parseInt(raw, 10)
}

// 404 unless an issue/solution row with this id exists. For handlers that only
// need existence — ones that read further columns do their own findFirst.
export async function assertIssueExists(issueId: number): Promise<void> {
  const node = await useDB().query.issues.findFirst({
    where: eq(issues.id, issueId),
    columns: { id: true },
  })
  if (!node) throw createError({ statusCode: 404, statusMessage: `Issue ${issueId} not found` })
}
