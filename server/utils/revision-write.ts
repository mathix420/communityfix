// Shared logic for the collaborative-revision layer: snapshots, diffs,
// permissions, and the propose/decide/withdraw lifecycle. This is the single
// source of truth that both the REST endpoints and the MCP propose tools call
// into, so the "owner/admin edit applies immediately, anyone else proposes"
// routing and the version-history ledger stay in one place.
//
// NOTE on the import cycle: this module imports `updateIssue`/`updateCaseStudy`
// (the single apply path) while those modules import the snapshot helpers below
// to record born-approved revisions. The cycle is safe because every imported
// binding is a function only called at request time, never at module init.
import type { H3Event } from 'h3'
import { and, eq } from 'drizzle-orm'
import { issues, caseStudies, users, revisions } from '../database/schema'
import type { RevisionTargetKind, RevisionStatus, RevisionDecidedByRole } from '../database/schema'
import { assertNotBanned } from './check-ban'
import { getIsAdmin } from './is-admin'
import { checkProposalRateLimit } from './rate-limiter'
import { triggerModeration } from './moderation-trigger'
import { createAuditLog } from './audit-log'
import { updateUserTrustScore } from './trust-score'
import { sendProposalNotification, sendDecisionNotification } from './email-revisions'
import { updateIssue } from './issue-write'
import { updateCaseStudy } from './case-study-write'
import { resolveDecideRole, addNodeMember, nodeOwnerContacts } from './node-members'

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

// Who may accept/reject a proposal is decided by node_members ownership now —
// see `resolveDecideRole` in node-members.ts.

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

// ---------------------------------------------------------------------------
// Propose
// ---------------------------------------------------------------------------

export interface ProposeRevisionInput {
  targetKind: RevisionTargetKind
  targetId: number
  changes: Snapshot
  note?: string | null
}

/**
 * Record a pending proposal against a node. Validates the proposer (ban + rate
 * limit), loads the node, snapshots its current editable state, diffs the
 * requested changes against it, and inserts a `pending` revision. Triggers the
 * AI pre-screen and (best-effort) notifies the owner. Pass `event` so the
 * owner email can be sent and links built; omit it (e.g. background callers) to
 * skip the email.
 */
export async function proposeRevision(
  userId: string,
  input: ProposeRevisionInput,
  event?: H3Event,
) {
  await assertNotBanned(userId)
  await checkProposalRateLimit(userId)
  const db = useDB()

  if (input.targetKind === 'issue') {
    const node = await db.query.issues.findFirst({ where: eq(issues.id, input.targetId) })
    if (!node)
      throw createError({ statusCode: 404, statusMessage: `Issue ${input.targetId} not found` })

    const baseSnapshot = editableIssueSnapshot(node)
    // Only diff the fields the proposer actually supplied — an absent field
    // means "leave as-is", not "set to current value".
    const proposed: Snapshot = {
      ...baseSnapshot,
      ...filterToKnownKeys(input.changes, baseSnapshot),
    }
    const changes = diffSnapshots(baseSnapshot, proposed)
    if (Object.keys(changes).length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'No changes to propose' })
    }

    const revision = await recordRevision({
      targetKind: 'issue',
      issueId: node.id,
      caseStudyId: null,
      proposerId: userId,
      status: 'pending',
      changes,
      baseSnapshot,
      baseUpdatedAt: node.updatedAt ?? null,
      note: input.note ?? null,
    })

    await triggerModeration('revision', revision.id)
    await createAuditLog({
      type: 'moderation',
      action: 'propose',
      issueId: node.id,
      userId,
      reason: input.note ?? null,
    })
    if (event)
      await notifyOwnersOfProposal(event, {
        targetKind: 'issue',
        nodeId: node.id,
        nodeLabel: node.title,
        revisionIssueId: node.id,
        revisionCaseStudyId: null,
        proposerId: userId,
        note: input.note ?? null,
      })
    return revision
  }

  const node = await db.query.caseStudies.findFirst({
    where: eq(caseStudies.id, input.targetId),
    with: { solution: { columns: { title: true } } },
  })
  if (!node)
    throw createError({ statusCode: 404, statusMessage: `Case study ${input.targetId} not found` })

  const baseSnapshot = editableCaseStudySnapshot(node)
  const proposed: Snapshot = { ...baseSnapshot, ...filterToKnownKeys(input.changes, baseSnapshot) }
  const changes = diffSnapshots(baseSnapshot, proposed)
  if (Object.keys(changes).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No changes to propose' })
  }

  const revision = await recordRevision({
    targetKind: 'case_study',
    issueId: null,
    caseStudyId: node.id,
    proposerId: userId,
    status: 'pending',
    changes,
    baseSnapshot,
    baseUpdatedAt: node.updatedAt ?? null,
    note: input.note ?? null,
  })

  await triggerModeration('revision', revision.id)
  await createAuditLog({
    type: 'moderation',
    action: 'propose',
    issueId: null,
    userId,
    reason: input.note ?? null,
  })
  if (event) {
    await notifyOwnersOfProposal(event, {
      targetKind: 'case_study',
      nodeId: node.id,
      nodeLabel: node.solution?.title
        ? `Case study — ${node.solution.title}`
        : `Case study #${node.id}`,
      revisionIssueId: null,
      revisionCaseStudyId: node.id,
      proposerId: userId,
      note: input.note ?? null,
    })
  }
  return revision
}

// Drop keys the snapshot doesn't know about so an arbitrary client payload
// can't smuggle non-editable fields into the diff.
function filterToKnownKeys(changes: Snapshot, base: Snapshot): Snapshot {
  const out: Snapshot = {}
  for (const key of Object.keys(changes)) {
    if (key in base) out[key] = changes[key]
  }
  return out
}

async function notifyOwnersOfProposal(
  event: H3Event,
  opts: {
    targetKind: RevisionTargetKind
    nodeId: number
    nodeLabel: string
    revisionIssueId: number | null
    revisionCaseStudyId: number | null
    proposerId: string
    note?: string | null
  },
) {
  const db = useDB()
  // Ownership lives in node_members now, so notify every owner (a node can have
  // several) rather than the legacy single authorId — and never the proposer,
  // even when they own the node themselves.
  const [owners, proposer] = await Promise.all([
    nodeOwnerContacts(opts.targetKind, opts.nodeId),
    db.query.users.findFirst({
      where: eq(users.id, opts.proposerId),
      columns: { name: true, trustScore: true },
    }),
  ])
  const recipients = owners.filter((o) => o.id !== opts.proposerId)
  if (recipients.length === 0) return
  await Promise.all(
    recipients.map((owner) =>
      sendProposalNotification(event, {
        ownerEmail: owner.email,
        ownerName: owner.name,
        proposerName: proposer?.name,
        proposerTrustScore: proposer?.trustScore ?? 0,
        nodeLabel: opts.nodeLabel,
        targetKind: opts.targetKind,
        issueId: opts.revisionIssueId,
        caseStudyId: opts.revisionCaseStudyId,
        note: opts.note ?? null,
      }),
    ),
  )
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

// Build the patch a revision's `changes` represents, mapping snapshot keys back
// onto the update-input shape (location → latitude/longitude).
function changesToIssuePatch(changes: Snapshot): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(changes)) {
    if (key === 'location') {
      const loc = value as { latitude: number; longitude: number } | null
      patch.latitude = loc?.latitude ?? null
      patch.longitude = loc?.longitude ?? null
    } else {
      patch[key] = value
    }
  }
  return patch
}

function changesToCaseStudyPatch(changes: Snapshot): Record<string, unknown> {
  // Same shape mapping as issues — location splits into lat/lng.
  return changesToIssuePatch(changes)
}

/**
 * Apply an approved revision to the live node, as the approver, via the single
 * write path (so sanitization, counters, embeddings, and re-moderation are
 * reused). Re-triggers content/structure moderation as needed and returns the
 * after-snapshot — the caller (decideRevision) owns persisting it onto the
 * revision row, so there is exactly one writer of the revision's status/snapshot.
 */
export async function applyRevision(
  approverId: string,
  revision: typeof revisions.$inferSelect,
): Promise<Snapshot> {
  const changes = (revision.changes ?? {}) as Snapshot

  if (revision.targetKind === 'issue') {
    const patch = changesToIssuePatch(changes)
    const { issue, contentChanged, parentChanged } = await updateIssue(approverId, {
      id: revision.issueId!,
      ...patch,
    })
    // The REST/MCP self-edit path triggers content moderation in its caller;
    // here we own the apply, so fire it directly.
    if (contentChanged) await triggerModeration('issue', issue.id)
    if (parentChanged) await triggerModeration('structure', issue.id)
    return editableIssueSnapshot(issue)
  }

  const patch = changesToCaseStudyPatch(changes)
  const { caseStudy } = await updateCaseStudy(approverId, { id: revision.caseStudyId!, ...patch })
  // updateCaseStudy self-triggers case-study moderation on content change.
  return editableCaseStudySnapshot(caseStudy)
}

// ---------------------------------------------------------------------------
// Decide (approve / reject)
// ---------------------------------------------------------------------------

export type DecideAction = 'approve' | 'reject'

/**
 * Owner/admin accepts or rejects a pending proposal. On approve the change is
 * applied to the live node (re-moderating as usual) and the revision is marked
 * approved; on reject the revision is marked rejected with the reason. Either
 * way the proposer is emailed (best-effort) and their trust score recomputed.
 */
export async function decideRevision(
  userId: string,
  revisionId: number,
  action: DecideAction,
  reason?: string | null,
  event?: H3Event,
) {
  const db = useDB()
  const revision = await db.query.revisions.findFirst({ where: eq(revisions.id, revisionId) })
  if (!revision)
    throw createError({ statusCode: 404, statusMessage: `Revision ${revisionId} not found` })
  if (revision.status !== 'pending') {
    throw createError({
      statusCode: 409,
      statusMessage: `Revision ${revisionId} is already ${revision.status}`,
    })
  }

  const node = await loadRevisionNode(revision)
  if (!node)
    throw createError({
      statusCode: 404,
      statusMessage: 'The node this revision targets no longer exists',
    })

  const nodeId = revision.targetKind === 'issue' ? revision.issueId! : revision.caseStudyId!
  const isAdmin = await getIsAdmin(userId)
  const role = await resolveDecideRole(userId, revision.targetKind, nodeId, isAdmin)
  if (!role) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only an owner or an admin can decide on this suggestion',
    })
  }

  const now = new Date()
  if (action === 'approve') {
    // Staleness guard: never silently clobber an edit that landed after this
    // proposal was written. baseUpdatedAt is the cheap gate (node untouched →
    // nothing to check); when the node has moved we compare field-by-field and
    // only block on the fields THIS proposal changes — non-overlapping concurrent
    // edits still merge, because applyRevision patches only the changed fields.
    const movedSinceProposed =
      !revision.baseUpdatedAt ||
      (node.updatedAt != null && node.updatedAt.getTime() !== revision.baseUpdatedAt.getTime())
    if (movedSinceProposed) {
      const currentSnapshot =
        revision.targetKind === 'issue'
          ? editableIssueSnapshot(node as IssueRow)
          : editableCaseStudySnapshot(node as CaseStudyRow)
      const conflicts = staleConflictFields(
        (revision.changes ?? {}) as Snapshot,
        (revision.baseSnapshot ?? {}) as Snapshot,
        currentSnapshot,
      )
      if (conflicts.length > 0) {
        // Retire the proposal as `superseded` rather than overwrite newer data.
        // The revision row itself (status + decidedBy* + reason + decidedAt) is
        // the audit trail for this system outcome, so no separate moderation log.
        await db
          .update(revisions)
          .set({
            status: 'superseded',
            decidedById: userId,
            decidedByRole: role,
            decisionReason: `Superseded: ${conflicts.join(', ')} changed since this was proposed`,
            decidedAt: now,
            updatedAt: now,
          })
          .where(and(eq(revisions.id, revision.id), eq(revisions.status, 'pending')))
        if (revision.proposerId && event) {
          await notifyProposerOfDecision(
            event,
            revision,
            'superseded',
            `${conflicts.join(', ')} changed since you proposed this — please review the current version and re-submit.`,
          )
        }
        throw createError({
          statusCode: 409,
          statusMessage: `This suggestion is out of date — ${conflicts.join(', ')} changed since it was proposed. It's been marked superseded; ask the proposer to re-submit.`,
        })
      }
    }

    // Atomically claim the pending row before touching the live node. The apply
    // path fires a non-transactional moderation trigger, so it can't sit inside
    // one SQL transaction; instead the pending → approved flip is the lock (only
    // one approver wins this conditional update) and we compensate back to pending
    // if apply throws. This makes "applied but still pending" — which would
    // double-apply on retry — impossible.
    const claimed = await db
      .update(revisions)
      .set({
        status: 'approved',
        decidedById: userId,
        decidedByRole: role,
        decisionReason: reason ?? null,
        decidedAt: now,
        updatedAt: now,
      })
      .where(and(eq(revisions.id, revision.id), eq(revisions.status, 'pending')))
      .returning({ id: revisions.id })
    if (claimed.length === 0) {
      throw createError({
        statusCode: 409,
        statusMessage: `Revision ${revision.id} was already decided`,
      })
    }

    let appliedSnapshot: Snapshot
    try {
      appliedSnapshot = await applyRevision(userId, revision)
    } catch (err) {
      // Apply failed — release the claim so the proposal stays decidable.
      await db
        .update(revisions)
        .set({
          status: 'pending',
          decidedById: null,
          decidedByRole: null,
          decisionReason: null,
          decidedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(revisions.id, revision.id))
      throw err
    }
    await db
      .update(revisions)
      .set({ appliedSnapshot, updatedAt: new Date() })
      .where(eq(revisions.id, revision.id))
    await createAuditLog({
      type: 'moderation',
      action: 'revise',
      issueId: revision.issueId ?? null,
      userId,
      reason: reason ?? null,
      details: { revisionId: revision.id, role },
    })
  } else {
    await db
      .update(revisions)
      .set({
        status: 'rejected',
        decidedById: userId,
        decidedByRole: role,
        decisionReason: reason ?? null,
        decidedAt: now,
        updatedAt: now,
      })
      .where(eq(revisions.id, revision.id))
    await createAuditLog({
      type: 'moderation',
      action: 'reject',
      issueId: revision.issueId ?? null,
      userId,
      reason: reason ?? null,
      details: { revisionId: revision.id, role },
    })
  }

  // An accepted proposal credits the proposer as a collaborator on the node
  // (no-op if they're already an owner — addNodeMember never downgrades).
  if (action === 'approve' && revision.proposerId) {
    try {
      await addNodeMember({
        kind: revision.targetKind,
        nodeId,
        userId: revision.proposerId,
        role: 'collaborator',
        source: 'accepted',
      })
    } catch (err) {
      console.warn('[revision] collaborator membership add failed:', err)
    }
  }

  // Notify the proposer + recompute their trust score (a genuine accepted
  // proposal nudges it up). Both best-effort.
  if (revision.proposerId) {
    if (event)
      await notifyProposerOfDecision(
        event,
        revision,
        action === 'approve' ? 'approved' : 'rejected',
        reason,
      )
    try {
      await updateUserTrustScore(revision.proposerId)
    } catch (err) {
      console.warn('[revision] trust-score recompute failed:', err)
    }
  }

  return db.query.revisions.findFirst({ where: eq(revisions.id, revision.id) })
}

async function notifyProposerOfDecision(
  event: H3Event,
  revision: typeof revisions.$inferSelect,
  decision: 'approved' | 'rejected' | 'superseded',
  reason?: string | null,
) {
  if (!revision.proposerId) return
  const db = useDB()
  const proposer = await db.query.users.findFirst({
    where: eq(users.id, revision.proposerId),
    columns: { email: true, name: true },
  })
  await sendDecisionNotification(event, {
    proposerEmail: proposer?.email,
    proposerName: proposer?.name,
    decision,
    reason,
    nodeLabel: await revisionNodeLabel(revision),
    targetKind: revision.targetKind,
    issueId: revision.issueId,
    caseStudyId: revision.caseStudyId,
  })
}

// ---------------------------------------------------------------------------
// Withdraw
// ---------------------------------------------------------------------------

/**
 * Proposer (or an admin) withdraws their own pending proposal.
 */
export async function withdrawRevision(userId: string, revisionId: number) {
  const db = useDB()
  const revision = await db.query.revisions.findFirst({ where: eq(revisions.id, revisionId) })
  if (!revision)
    throw createError({ statusCode: 404, statusMessage: `Revision ${revisionId} not found` })
  if (revision.status !== 'pending') {
    throw createError({
      statusCode: 409,
      statusMessage: `Revision ${revisionId} is already ${revision.status}`,
    })
  }

  const isAdmin = await getIsAdmin(userId)
  if (revision.proposerId !== userId && !isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only the proposer or an admin can withdraw this suggestion',
    })
  }

  const now = new Date()
  await db
    .update(revisions)
    .set({ status: 'withdrawn', updatedAt: now })
    .where(eq(revisions.id, revision.id))
  await createAuditLog({
    type: 'moderation',
    action: 'withdraw',
    issueId: revision.issueId ?? null,
    userId,
    details: { revisionId: revision.id },
  })
  return db.query.revisions.findFirst({ where: eq(revisions.id, revision.id) })
}

// ---------------------------------------------------------------------------
// Shared node lookups
// ---------------------------------------------------------------------------

// Returns the full node row so decideRevision can both confirm existence and
// snapshot the live state for the staleness guard.
async function loadRevisionNode(
  revision: typeof revisions.$inferSelect,
): Promise<IssueRow | CaseStudyRow | null> {
  const db = useDB()
  if (revision.targetKind === 'issue' && revision.issueId != null) {
    return (await db.query.issues.findFirst({ where: eq(issues.id, revision.issueId) })) ?? null
  }
  if (revision.targetKind === 'case_study' && revision.caseStudyId != null) {
    return (
      (await db.query.caseStudies.findFirst({ where: eq(caseStudies.id, revision.caseStudyId) })) ??
      null
    )
  }
  return null
}

async function revisionNodeLabel(revision: typeof revisions.$inferSelect): Promise<string> {
  const db = useDB()
  if (revision.targetKind === 'issue' && revision.issueId != null) {
    const node = await db.query.issues.findFirst({
      where: eq(issues.id, revision.issueId),
      columns: { title: true },
    })
    return node?.title ?? `Issue #${revision.issueId}`
  }
  if (revision.caseStudyId != null) {
    const node = await db.query.caseStudies.findFirst({
      where: eq(caseStudies.id, revision.caseStudyId),
      with: { solution: { columns: { title: true } } },
    })
    return node?.solution?.title
      ? `Case study — ${node.solution.title}`
      : `Case study #${revision.caseStudyId}`
  }
  return 'this node'
}
