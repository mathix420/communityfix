// Leaf primitives for the collaborative-revision layer: field snapshots, diffs,
// the revision-row insert, and the read/serialization contract. Deliberately
// free of any dependency on the issue/case-study write paths, so those writers
// can record born-approved revisions without forming an import cycle. The
// lifecycle (propose / apply / decide / withdraw) lives in revision-write.ts,
// which builds on these.
import { issues, caseStudies, revisions } from '../database/schema'
import type { RevisionTargetKind, RevisionStatus, RevisionDecidedByRole } from '../database/schema'

// A JSON-serialisable snapshot of a node's proposable fields. Locations are
// flattened to {latitude, longitude} so a revision row round-trips cleanly
// through jsonb.
export type Snapshot = Record<string, unknown>

type IssueRow = typeof issues.$inferSelect
type CaseStudyRow = typeof caseStudies.$inferSelect

function locationToJson(location: unknown): { latitude: number; longitude: number } | null {
  const loc = location as { x: number; y: number } | null
  if (!loc || loc.x == null || loc.y == null) return null
  return { latitude: loc.y, longitude: loc.x }
}

/**
 * The proposable field subset of an issue/solution — mirrors UpdateIssueInput
 * (excluding admin-only fields) plus the structural `parentId`. Returns a plain
 * JSON object suitable for storing in a revision snapshot/diff.
 */
export function editableIssueSnapshot(row: IssueRow): Snapshot {
  return {
    title: row.title,
    summary: row.summary,
    description: row.description ?? null,
    solutionStatus: row.type === 'solution' ? (row.solutionStatus ?? null) : null,
    locationName: row.locationName ?? null,
    location: locationToJson(row.location),
    scale: row.scale ?? null,
    links: row.type === 'solution' ? (row.links ?? null) : null,
    parentId: row.parentId ?? null,
  }
}

/**
 * The proposable field subset of a case study — mirrors UpdateCaseStudyInput
 * (excluding admin-only `verified`) plus the structural `solutionId`.
 */
export function editableCaseStudySnapshot(row: CaseStudyRow): Snapshot {
  return {
    outcome: row.outcome,
    scale: row.scale ?? null,
    locationName: row.locationName,
    location: locationToJson(row.location),
    description: row.description ?? null,
    implementer: row.implementer ?? null,
    startDate: row.startDate ?? null,
    endDate: row.endDate ?? null,
    metrics: row.metrics ?? null,
    cost: row.cost ?? null,
    currency: row.currency ?? null,
    fundingSource: row.fundingSource ?? null,
    sources: row.sources ?? null,
    lessonsLearned: row.lessonsLearned ?? null,
    links: row.links ?? null,
    solutionId: row.solutionId,
  }
}

/**
 * Pure: the fields whose value differs between two snapshots. Deep-equal via
 * JSON so nested arrays/objects (links, metrics, location) compare by value.
 * An empty result means "no real change".
 */
export function diffSnapshots(before: Snapshot, after: Snapshot): Snapshot {
  const changes: Snapshot = {}
  for (const key of Object.keys(after)) {
    const a = after[key]
    const b = before[key]
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changes[key] = a
    }
  }
  return changes
}

/**
 * Pure: of the fields a proposal changes, which ones have moved in the live node
 * since the proposal was diffed (current value no longer equals the base it was
 * built on). These are genuine conflicts — applying would clobber newer data.
 * Fields the proposal doesn't touch are ignored (they merge cleanly), so an
 * empty result means the proposal is safe to apply even if the node changed
 * elsewhere.
 */
export function staleConflictFields(
  changes: Snapshot,
  baseSnapshot: Snapshot,
  currentSnapshot: Snapshot,
): string[] {
  const conflicts: string[] = []
  for (const key of Object.keys(changes)) {
    if (JSON.stringify(currentSnapshot[key]) !== JSON.stringify(baseSnapshot[key])) {
      conflicts.push(key)
    }
  }
  return conflicts
}

/**
 * Insert a revision row. Used by both the direct-edit path (born-approved) and
 * the propose/approve paths. Returns the inserted row.
 */
export async function recordRevision(entry: {
  targetKind: RevisionTargetKind
  issueId?: number | null
  caseStudyId?: number | null
  proposerId: string | null
  status: RevisionStatus
  changes: Snapshot
  baseSnapshot: Snapshot
  appliedSnapshot?: Snapshot | null
  baseUpdatedAt?: Date | null
  note?: string | null
  decidedById?: string | null
  decidedByRole?: RevisionDecidedByRole | null
  decisionReason?: string | null
  decidedAt?: Date | null
}) {
  const db = useDB()
  const decided = entry.status === 'approved' || entry.status === 'rejected'
  const rows = await db
    .insert(revisions)
    .values({
      targetKind: entry.targetKind,
      issueId: entry.issueId ?? null,
      caseStudyId: entry.caseStudyId ?? null,
      proposerId: entry.proposerId,
      status: entry.status,
      changes: entry.changes,
      baseSnapshot: entry.baseSnapshot,
      appliedSnapshot: entry.appliedSnapshot ?? null,
      baseUpdatedAt: entry.baseUpdatedAt ?? null,
      note: entry.note ?? null,
      decidedById: entry.decidedById ?? null,
      decidedByRole: entry.decidedByRole ?? null,
      decisionReason: entry.decisionReason ?? null,
      decidedAt: entry.decidedAt ?? (decided ? new Date() : null),
    })
    .returning()
  return rows[0]!
}

// ---------------------------------------------------------------------------
// Serialization (REST/MCP read contract)
// ---------------------------------------------------------------------------

type RevisionRow = typeof revisions.$inferSelect

// A revision row with the proposer/decider relations optionally hydrated. The
// REST endpoints load these with `{ with: { proposer, decidedBy } }`; only the
// display name is ever exposed (never the email).
export type RevisionWithPeople = RevisionRow & {
  proposer?: { id: string; name: string | null } | null
  decidedBy?: { id: string; name: string | null } | null
}

// The public-facing JSON shape of a revision. `proposer`/`decidedBy` collapse
// to `{ id, name }` (name only, never email). `aiConfidence` is the DB numeric
// coerced to a number. Used by every revisions GET endpoint so the read
// contract lives in one place.
export interface SerializedRevision {
  id: number
  targetKind: RevisionTargetKind
  issueId: number | null
  caseStudyId: number | null
  status: RevisionStatus
  changes: Snapshot
  baseSnapshot: Snapshot
  appliedSnapshot: Snapshot | null
  baseUpdatedAt: string | null
  note: string | null
  aiVerdict: RevisionRow['aiVerdict']
  aiConfidence: number | null
  aiReason: string | null
  proposer: { id: string; name: string } | null
  decidedBy: { id: string; name: string } | null
  decidedByRole: RevisionDecidedByRole | null
  decisionReason: string | null
  decidedAt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Serialize a revision row for an API response. Collapses the proposer/decider
 * relations to `{ id, name }` (display name only — never the email) and
 * normalises timestamps to ISO strings and `aiConfidence` to a number.
 */
export function serializeRevision(row: RevisionWithPeople): SerializedRevision {
  return {
    id: row.id,
    targetKind: row.targetKind,
    issueId: row.issueId,
    caseStudyId: row.caseStudyId,
    status: row.status,
    changes: (row.changes ?? {}) as Snapshot,
    baseSnapshot: (row.baseSnapshot ?? {}) as Snapshot,
    appliedSnapshot: (row.appliedSnapshot ?? null) as Snapshot | null,
    baseUpdatedAt: row.baseUpdatedAt ? row.baseUpdatedAt.toISOString() : null,
    note: row.note,
    aiVerdict: row.aiVerdict,
    aiConfidence: row.aiConfidence != null ? Number(row.aiConfidence) : null,
    aiReason: row.aiReason,
    proposer: row.proposer ? { id: row.proposer.id, name: row.proposer.name ?? 'Anonymous' } : null,
    decidedBy: row.decidedBy
      ? { id: row.decidedBy.id, name: row.decidedBy.name ?? 'Anonymous' }
      : null,
    decidedByRole: row.decidedByRole,
    decisionReason: row.decisionReason,
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/**
 * Can this viewer see a non-approved (pending/rejected/withdrawn/superseded)
 * revision? Approved revisions are public version history; everything else is
 * private to a node owner, an admin, or the proposer. `viewerIsOwner` is whether
 * the viewer owns the targeted node (any of its owners — see node_members).
 */
export function canViewRevision(
  row: { status: RevisionStatus; proposerId: string | null },
  viewerIsOwner: boolean,
  viewerId: string | null,
  isAdmin: boolean,
): boolean {
  if (row.status === 'approved') return true
  if (!viewerId) return false
  if (isAdmin) return true
  if (viewerIsOwner) return true
  if (row.proposerId && row.proposerId === viewerId) return true
  return false
}
