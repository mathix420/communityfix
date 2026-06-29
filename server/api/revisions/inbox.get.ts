// The current user's revision inbox, powering the header badge + inbox page:
//   - `toReview`: pending proposals on nodes this user authored (awaiting their
//     decision). Born-approved self-edits never appear (proposer === owner).
//   - `mine`: this user's own proposals across every status.
// Each entry is a serialized revision plus a small `node` descriptor (label +
// ids) so the UI can link/render without a second fetch.
import { and, eq, desc, inArray, ne, or } from 'drizzle-orm'
import { issues, caseStudies, revisions } from '../../database/schema'
import { serializeRevision, type SerializedRevision } from '../../utils/revision-write'
import { getIsAdmin } from '../../utils/is-admin'
import { ownedNodeIds } from '../../utils/node-members'

interface RevisionNodeRef {
  targetKind: 'issue' | 'case_study'
  issueId: number | null
  caseStudyId: number | null
  label: string
}

type InboxEntry = SerializedRevision & { node: RevisionNodeRef }

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id
  const db = useDB()

  // Nodes this user owns — any owner (not just the creator) reviews proposals.
  const [ownedIssueIds, ownedCaseStudyIds] = await Promise.all([
    ownedNodeIds(userId, 'issue'),
    ownedNodeIds(userId, 'case_study'),
  ])

  const peopleWith = {
    proposer: { columns: { id: true, name: true } },
    decidedBy: { columns: { id: true, name: true } },
  } as const

  const [toReviewRows, mineRows] = await Promise.all([
    // Pending proposals on my nodes, excluding my own (born-approved edits are
    // never pending, but a self-proposal — should one exist — isn't "to review").
    (ownedIssueIds.length || ownedCaseStudyIds.length)
      ? db.query.revisions.findMany({
          where: and(
            eq(revisions.status, 'pending'),
            ne(revisions.proposerId, userId),
            or(
              ownedIssueIds.length ? inArray(revisions.issueId, ownedIssueIds) : undefined,
              ownedCaseStudyIds.length ? inArray(revisions.caseStudyId, ownedCaseStudyIds) : undefined,
            ),
          ),
          with: peopleWith,
          orderBy: desc(revisions.createdAt),
        })
      : Promise.resolve([]),

    // Everything I proposed, newest first.
    db.query.revisions.findMany({
      where: eq(revisions.proposerId, userId),
      with: peopleWith,
      orderBy: desc(revisions.createdAt),
    }),
  ])

  const labels = await buildNodeLabels([...toReviewRows, ...mineRows])
  const decorate = (row: typeof toReviewRows[number]): InboxEntry => ({
    ...serializeRevision(row),
    node: nodeRef(row, labels),
  })

  return {
    toReview: toReviewRows.map(decorate),
    mine: mineRows.map(decorate),
    isAdmin: await getIsAdmin(userId),
  }
})

// Resolve a human label for every referenced node in two grouped queries.
async function buildNodeLabels(rows: { issueId: number | null, caseStudyId: number | null }[]) {
  const db = useDB()
  const issueIds = Array.from(new Set(rows.map(r => r.issueId).filter((v): v is number => v != null)))
  const caseStudyIds = Array.from(new Set(rows.map(r => r.caseStudyId).filter((v): v is number => v != null)))

  const [issueRows, caseStudyRows] = await Promise.all([
    issueIds.length
      ? db.query.issues.findMany({ where: inArray(issues.id, issueIds), columns: { id: true, title: true } })
      : Promise.resolve([]),
    caseStudyIds.length
      ? db.query.caseStudies.findMany({
          where: inArray(caseStudies.id, caseStudyIds),
          columns: { id: true },
          with: { solution: { columns: { title: true } } },
        })
      : Promise.resolve([]),
  ])

  const issueLabels = new Map(issueRows.map(r => [r.id, r.title]))
  const caseStudyLabels = new Map(
    caseStudyRows.map(r => [r.id, r.solution?.title ? `Case study — ${r.solution.title}` : `Case study #${r.id}`]),
  )
  return { issueLabels, caseStudyLabels }
}

function nodeRef(
  row: { targetKind: 'issue' | 'case_study', issueId: number | null, caseStudyId: number | null },
  labels: { issueLabels: Map<number, string>, caseStudyLabels: Map<number, string> },
): RevisionNodeRef {
  if (row.targetKind === 'issue') {
    return {
      targetKind: 'issue',
      issueId: row.issueId,
      caseStudyId: null,
      label: (row.issueId != null && labels.issueLabels.get(row.issueId)) || `Issue #${row.issueId}`,
    }
  }
  return {
    targetKind: 'case_study',
    issueId: null,
    caseStudyId: row.caseStudyId,
    label: (row.caseStudyId != null && labels.caseStudyLabels.get(row.caseStudyId)) || `Case study #${row.caseStudyId}`,
  }
}
