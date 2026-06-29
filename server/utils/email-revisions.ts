// Transactional mail for the collaborative-revision flow. All sends are
// best-effort: a failed notification must never break proposing or deciding,
// so every call is wrapped in try/catch and only warns on failure. In
// `bun run dev` there's no EMAIL binding, so `sendEmail` logs to the console
// instead (see server/utils/email.ts).
import type { H3Event } from 'h3'
import { sendEmail } from './email'

// Proposers below this trust score don't generate an owner notification email —
// the AI pre-screen + in-app inbox still surface their proposal, but we don't
// want low-trust accounts to be able to spam owners' inboxes. The proposer is
// always emailed on an explicit human decision regardless of trust.
export const PROPOSAL_NOTIFY_MIN_TRUST = 10

function nodeUrl(event: H3Event, targetKind: 'issue' | 'case_study', issueId: number | null, caseStudyId: number | null): string {
  const origin = getRequestURL(event).origin
  if (targetKind === 'issue' && issueId != null) return `${origin}/issue/${issueId}`
  if (targetKind === 'case_study' && caseStudyId != null) return `${origin}/case-study/${caseStudyId}`
  return origin
}

/**
 * Notify a node owner that someone proposed an edit to their node. Skipped when
 * the proposer's trust score is below `PROPOSAL_NOTIFY_MIN_TRUST` (the proposal
 * still lands in the owner's in-app inbox). Best-effort.
 */
export async function sendProposalNotification(event: H3Event, opts: {
  ownerEmail: string | null | undefined
  ownerName?: string | null
  proposerName?: string | null
  proposerTrustScore: number
  nodeLabel: string
  targetKind: 'issue' | 'case_study'
  issueId: number | null
  caseStudyId: number | null
  note?: string | null
}): Promise<void> {
  if (!opts.ownerEmail) return
  if (opts.proposerTrustScore < PROPOSAL_NOTIFY_MIN_TRUST) return

  const url = nodeUrl(event, opts.targetKind, opts.issueId, opts.caseStudyId)
  const who = opts.proposerName?.trim() || 'A community member'
  try {
    await sendEmail(event, {
      to: opts.ownerEmail,
      subject: `New suggested edit on "${opts.nodeLabel}"`,
      html: `
        <p>Hi${opts.ownerName ? ` ${opts.ownerName}` : ''},</p>
        <p>${who} suggested an edit to <strong>${opts.nodeLabel}</strong>.</p>
        ${opts.note ? `<p style="color:#555;">"${opts.note}"</p>` : ''}
        <p><a href="${url}">Review the suggestion</a> to approve or reject it.</p>
      `,
    })
  }
  catch (err) {
    console.warn('[email-revisions] proposal notification failed:', err)
  }
}

/**
 * Notify a proposer that the owner/admin approved or rejected their suggestion.
 * Always sent on an explicit human decision. Best-effort.
 */
export async function sendDecisionNotification(event: H3Event, opts: {
  proposerEmail: string | null | undefined
  proposerName?: string | null
  decision: 'approved' | 'rejected' | 'superseded'
  reason?: string | null
  nodeLabel: string
  targetKind: 'issue' | 'case_study'
  issueId: number | null
  caseStudyId: number | null
}): Promise<void> {
  if (!opts.proposerEmail) return

  const url = nodeUrl(event, opts.targetKind, opts.issueId, opts.caseStudyId)
  // 'superseded' = the node changed under the proposal before it was accepted,
  // so it was retired without applying (see the staleness guard in decideRevision).
  const verb = opts.decision === 'approved'
    ? 'accepted'
    : opts.decision === 'superseded'
      ? 'superseded by newer changes'
      : 'declined'
  const subject = opts.decision === 'superseded'
    ? 'Your suggested edit is out of date'
    : `Your suggested edit was ${verb}`
  try {
    await sendEmail(event, {
      to: opts.proposerEmail,
      subject,
      html: `
        <p>Hi${opts.proposerName ? ` ${opts.proposerName}` : ''},</p>
        <p>Your suggested edit to <strong>${opts.nodeLabel}</strong> was <strong>${verb}</strong>.</p>
        ${opts.reason ? `<p style="color:#555;">"${opts.reason}"</p>` : ''}
        <p><a href="${url}">View the node</a>.</p>
      `,
    })
  }
  catch (err) {
    console.warn('[email-revisions] decision notification failed:', err)
  }
}
