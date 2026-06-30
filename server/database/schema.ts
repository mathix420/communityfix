import {
  pgTable,
  text,
  integer,
  serial,
  boolean,
  timestamp,
  uuid,
  jsonb,
  primaryKey,
  unique,
  index,
  numeric,
  date,
} from 'drizzle-orm/pg-core'
import { vector } from 'drizzle-orm/pg-core'
import { geometry } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const PROVIDERS = ['google', 'apple', 'passkey'] as const
export type Provider = (typeof PROVIDERS)[number]

export const ISSUE_STATUSES = ['pending', 'approved', 'rejected'] as const
export type IssueStatus = (typeof ISSUE_STATUSES)[number]

export const ISSUE_TYPES = ['issue', 'solution'] as const
export type IssueType = (typeof ISSUE_TYPES)[number]

export const APPEAL_STATUSES = ['pending', 'approved', 'denied'] as const
export type AppealStatus = (typeof APPEAL_STATUSES)[number]

export const LOCATION_SCALES = ['neighborhood', 'city', 'region', 'national', 'global'] as const
export type LocationScale = (typeof LOCATION_SCALES)[number]

// GeoJSON area geometry for a location's `area` column. coordinates is kept
// concrete (not unknown) so it satisfies the Workers Serializable bound.
export interface GeoJsonGeometry {
  type: string
  coordinates: number[] | number[][] | number[][][] | number[][][][]
}

export const SOLUTION_STATUSES = ['plan', 'in-progress', 'done'] as const
export type SolutionStatus = (typeof SOLUTION_STATUSES)[number]

export const CASE_STUDY_OUTCOMES = [
  'success',
  'partial',
  'failed',
  'inconclusive',
  'ongoing',
] as const
export type CaseStudyOutcome = (typeof CASE_STUDY_OUTCOMES)[number]

export const AUDIT_LOG_TYPES = [
  'moderation',
  'structure',
  'trust_score',
  'auto_ban',
  'appeal',
  'admin_override',
] as const
export type AuditLogType = (typeof AUDIT_LOG_TYPES)[number]

export const AUDIT_LOG_ACTIONS = [
  'approve',
  'reject',
  'flag_spam',
  'flag_duplicate',
  'reparent',
  'convert_to_case_study',
  'ban',
  'unban',
  'score_update',
  'appeal_submitted',
  'appeal_approved',
  'appeal_denied',
  'override_approve',
  'override_reject',
  'request_info',
  'flag_uncertain',
  'remod',
  'relocate',
  'curate',
  // Collaborative revisions: a user proposes an edit, the owner/admin
  // accepts/rejects, or the proposer withdraws it.
  'propose',
  'revise',
  'withdraw',
] as const
export type AuditLogAction = (typeof AUDIT_LOG_ACTIONS)[number]

export const REVISION_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'withdrawn',
  'superseded',
] as const
export type RevisionStatus = (typeof REVISION_STATUSES)[number]

// 'issue' covers solutions too (they live in the issues table).
export const REVISION_TARGET_KINDS = ['issue', 'case_study'] as const
export type RevisionTargetKind = (typeof REVISION_TARGET_KINDS)[number]

// null verdict = not screened (e.g. dev with no Worker binding).
export const REVISION_AI_VERDICTS = ['ok', 'spam', 'vandalism'] as const
export type RevisionAiVerdict = (typeof REVISION_AI_VERDICTS)[number]

// Who pressed accept/reject on a proposal.
export const REVISION_DECIDED_BY_ROLES = ['owner', 'admin'] as const
export type RevisionDecidedByRole = (typeof REVISION_DECIDED_BY_ROLES)[number]

// Membership roles on a node (issue/solution or case study). No node has a
// single hard "author" anymore — the community owns it. `owner`s can edit
// without approval and accept/reject proposals; `collaborator`s are credited
// (their suggestion landed) but hold no extra rights. See `node_members`.
export const NODE_MEMBER_ROLES = ['owner', 'collaborator'] as const
export type NodeMemberRole = (typeof NODE_MEMBER_ROLES)[number]

// How a membership came to be: the node creator, an accepted proposal, or an
// explicit grant by an owner/admin.
export const NODE_MEMBER_SOURCES = ['creator', 'accepted', 'granted'] as const
export type NodeMemberSource = (typeof NODE_MEMBER_SOURCES)[number]

export const AUDIT_LOG_STATUSES = [
  'auto_resolved',
  'needs_review',
  'reviewed',
  'overridden',
] as const
export type AuditLogStatus = (typeof AUDIT_LOG_STATUSES)[number]

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  // Short one-line description shown under the name on profiles.
  headline: text('headline'),
  // Long-form bio shown on the public profile page.
  bio: text('bio'),
  // Free-text location ("Brussels, BE", "Remote"). Not geocoded.
  location: text('location'),
  provider: text('provider').$type<Provider>(),
  bannedUntil: timestamp('banned_until', { withTimezone: true }),
  banReason: text('ban_reason'),
  banAppealedAt: timestamp('ban_appealed_at', { withTimezone: true }),
  banAppealStatus: text('ban_appeal_status').$type<AppealStatus>(),
  banAppealReason: text('ban_appeal_reason'),
  trustScore: integer('trust_score').notNull().default(0),
  trustScoreUpdatedAt: timestamp('trust_score_updated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const usersRelations = relations(users, ({ many }) => ({
  credentials: many(credentials),
  issues: many(issues),
  votes: many(votes),
  qualifications: many(qualifications),
  endorsementsGiven: many(qualificationEndorsements),
}))

export const credentials = pgTable('credentials', {
  id: text('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  publicKey: text('public_key').notNull(),
  counter: integer('counter').notNull().default(0),
  backedUp: boolean('backed_up').notNull().default(false),
  transports: jsonb('transports').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const credentialsRelations = relations(credentials, ({ one }) => ({
  user: one(users, { fields: [credentials.userId], references: [users.id] }),
}))

export const sdgs = pgTable('sdgs', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  iconUrl: text('icon_url').notNull(),
  link: text('link').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const issues = pgTable('issues', {
  id: serial('id').primaryKey(),
  parentId: integer('parent_id').references((): any => issues.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  description: text('description'),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  solutionCount: integer('solution_count').notNull().default(0),
  subIssueCount: integer('sub_issue_count').notNull().default(0),
  voteScore: integer('vote_score').notNull().default(0),
  status: text('status').notNull().default('pending').$type<IssueStatus>(),
  type: text('type').notNull().default('issue').$type<IssueType>(),
  rejectionReason: text('rejection_reason'),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  isSpam: boolean('is_spam').notNull().default(false),
  appealReason: text('appeal_reason'),
  appealStatus: text('appeal_status').$type<AppealStatus>(),
  appealedAt: timestamp('appealed_at', { withTimezone: true }),
  locationName: text('location_name'),
  location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }),
  scale: text('scale').$type<LocationScale>(),
  // GeoJSON area for the location; `location` above is the centroid.
  area: jsonb('area').$type<GeoJsonGeometry>(),
  // Only meaningful when type='solution'.
  solutionStatus: text('solution_status').$type<SolutionStatus>(),
  // External resources — only surfaced for solutions.
  links: jsonb('links').$type<Array<{ url: string; title?: string }>>(),
  infoRequest: text('info_request'),
  infoRequestedAt: timestamp('info_requested_at', { withTimezone: true }),
  infoResponse: text('info_response'),
  infoRespondedAt: timestamp('info_responded_at', { withTimezone: true }),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const issuesRelations = relations(issues, ({ one, many }) => ({
  author: one(users, { fields: [issues.authorId], references: [users.id] }),
  parent: one(issues, {
    fields: [issues.parentId],
    references: [issues.id],
    relationName: 'parentChild',
  }),
  children: many(issues, { relationName: 'parentChild' }),
  issueTags: many(issueTags),
  issueSdgs: many(issueSdgs),
  votes: many(votes),
  caseStudies: many(caseStudies),
}))

export const votes = pgTable(
  'votes',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    issueId: integer('issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),
    value: integer('value').notNull(), // +1 or -1
    weight: integer('weight').notNull().default(1), // derived from voter's trust score
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.issueId)],
)

export const votesRelations = relations(votes, ({ one }) => ({
  user: one(users, { fields: [votes.userId], references: [users.id] }),
  issue: one(issues, { fields: [votes.issueId], references: [issues.id] }),
}))

export const issueTags = pgTable(
  'issue_tags',
  {
    issueId: integer('issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.issueId, t.tagId] })],
)

export const issueTagsRelations = relations(issueTags, ({ one }) => ({
  issue: one(issues, { fields: [issueTags.issueId], references: [issues.id] }),
  tag: one(tags, { fields: [issueTags.tagId], references: [tags.id] }),
}))

export const issueSdgs = pgTable(
  'issue_sdgs',
  {
    issueId: integer('issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),
    sdgId: integer('sdg_id')
      .notNull()
      .references(() => sdgs.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.issueId, t.sdgId] })],
)

export const issueSdgsRelations = relations(issueSdgs, ({ one }) => ({
  issue: one(issues, { fields: [issueSdgs.issueId], references: [issues.id] }),
  sdg: one(sdgs, { fields: [issueSdgs.sdgId], references: [sdgs.id] }),
}))

// Named `qualifications` to avoid collision with the WebAuthn `credentials`
// table above. Surfaced to users as "Credentials" in the UI.
export const qualifications = pgTable(
  'qualifications',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Short headline of the qualification, e.g. "10 years as structural engineer".
    title: text('title').notNull(),
    // Area/domain tag, e.g. "civil engineering", "urban planning", "nursing".
    area: text('area').notNull(),
    // Optional longer context — how, where, when, proof links.
    detail: text('detail'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('qualifications_user_id_idx').on(t.userId)],
)

export const qualificationsRelations = relations(qualifications, ({ one, many }) => ({
  user: one(users, { fields: [qualifications.userId], references: [users.id] }),
  endorsements: many(qualificationEndorsements),
}))

export const ENDORSEMENT_KINDS = ['endorsement', 'verification'] as const
export type EndorsementKind = (typeof ENDORSEMENT_KINDS)[number]

// A community acknowledgement that a user's qualification is legitimate.
// Rule: only users who themselves have received at least one endorsement
// may endorse others. When a qualification's content is edited, every row
// for that qualification is deleted — the claim has changed, so past
// endorsements no longer apply.
//
// `kind` distinguishes:
//   - 'endorsement'  : a peer vouching (counts toward endorsementCount)
//   - 'verification' : an admin/team vouching (shows a verified badge,
//                      does NOT increment endorsementCount)
export const qualificationEndorsements = pgTable(
  'qualification_endorsements',
  {
    id: serial('id').primaryKey(),
    qualificationId: integer('qualification_id')
      .notNull()
      .references(() => qualifications.id, { onDelete: 'cascade' }),
    endorserId: uuid('endorser_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind').$type<EndorsementKind>().notNull().default('endorsement'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('qualification_endorsements_unique').on(t.qualificationId, t.endorserId),
    index('qualification_endorsements_endorser_idx').on(t.endorserId),
  ],
)

export const qualificationEndorsementsRelations = relations(
  qualificationEndorsements,
  ({ one }) => ({
    qualification: one(qualifications, {
      fields: [qualificationEndorsements.qualificationId],
      references: [qualifications.id],
    }),
    endorser: one(users, {
      fields: [qualificationEndorsements.endorserId],
      references: [users.id],
    }),
  }),
)

export const oauthClients = pgTable('oauth_clients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  redirectUris: jsonb('redirect_uris').$type<string[]>().notNull().default([]),
  // null for PKCE-only public clients; sha256 hex for confidential.
  secretHash: text('secret_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const oauthCodes = pgTable('oauth_codes', {
  code: text('code').primaryKey(),
  clientId: text('client_id')
    .notNull()
    .references(() => oauthClients.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  redirectUri: text('redirect_uri').notNull(),
  codeChallenge: text('code_challenge').notNull(),
  codeChallengeMethod: text('code_challenge_method').notNull().default('S256'),
  scope: text('scope').notNull().default(''),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// A case study documents one real-world implementation of a solution. The
// solution row itself stays abstract; case studies capture where it was
// actually run, what happened, and what to learn from it.
export const caseStudies = pgTable(
  'case_studies',
  {
    id: serial('id').primaryKey(),
    solutionId: integer('solution_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    // Moderation state mirrors issues — pending until AI/admin review approves
    // or rejects. Rejected studies stay hidden from public listings; isSpam
    // additionally suppresses them from the author's own profile.
    status: text('status').notNull().default('pending').$type<IssueStatus>(),
    rejectionReason: text('rejection_reason'),
    rejectedAt: timestamp('rejected_at', { withTimezone: true }),
    isSpam: boolean('is_spam').notNull().default(false),
    description: text('description'),
    outcome: text('outcome').notNull().$type<CaseStudyOutcome>(),
    scale: text('scale').$type<LocationScale>(),
    locationName: text('location_name').notNull(),
    location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }).notNull(),
    // GeoJSON area for the location (see issues.area). The point above is the centroid.
    area: jsonb('area').$type<GeoJsonGeometry>(),
    // Admin-set: lets us mark a case study as independently verified.
    verified: boolean('verified').notNull().default(false),
    implementer: text('implementer'),
    startDate: date('start_date', { mode: 'string' }),
    endDate: date('end_date', { mode: 'string' }),
    metrics:
      jsonb('metrics').$type<
        Array<{ label: string; baseline?: string; result?: string; unit?: string }>
      >(),
    cost: numeric('cost'),
    currency: text('currency'),
    fundingSource: text('funding_source'),
    sources: jsonb('sources').$type<Array<{ url: string; title?: string }>>(),
    // Each entry is one stand-alone lesson — matches the row shape of metrics
    // and sources so the form/card render the same way.
    lessonsLearned: jsonb('lessons_learned').$type<string[]>(),
    // External resources documenting the deployment. Separate from `sources`,
    // which is reserved for citations backing the claims.
    links: jsonb('links').$type<Array<{ url: string; title?: string }>>(),
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('case_studies_solution_idx').on(t.solutionId)],
)

export const caseStudiesRelations = relations(caseStudies, ({ one }) => ({
  solution: one(issues, { fields: [caseStudies.solutionId], references: [issues.id] }),
  author: one(users, { fields: [caseStudies.authorId], references: [users.id] }),
}))

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    type: text('type').notNull().$type<AuditLogType>(),
    action: text('action').notNull().$type<AuditLogAction>(),
    status: text('status').notNull().default('auto_resolved').$type<AuditLogStatus>(),
    issueId: integer('issue_id').references(() => issues.id, { onDelete: 'set null' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    reason: text('reason'),
    details: jsonb('details').$type<Record<string, unknown>>(),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewNote: text('review_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_logs_type_idx').on(t.type),
    index('audit_logs_status_idx').on(t.status),
    index('audit_logs_issue_id_idx').on(t.issueId),
    index('audit_logs_user_id_idx').on(t.userId),
    index('audit_logs_created_at_idx').on(t.createdAt),
  ],
)

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  issue: one(issues, { fields: [auditLogs.issueId], references: [issues.id] }),
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
  reviewer: one(users, {
    fields: [auditLogs.reviewedBy],
    references: [users.id],
    relationName: 'auditReviewer',
  }),
}))

export const oauthTokens = pgTable(
  'oauth_tokens',
  {
    // sha256 of the raw token — raw value never persisted.
    tokenHash: text('token_hash').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => oauthClients.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    scope: text('scope').notNull().default(''),
    refreshHash: text('refresh_hash'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('oauth_tokens_user_idx').on(t.userId),
    index('oauth_tokens_refresh_idx').on(t.refreshHash),
  ],
)

// Append-only ledger of every change to a node (issue/solution or case study).
// Owner/admin edits land as born-approved rows (proposer = decider); anyone
// else's edit lands as a `pending` proposal that leaves the live node untouched
// until the owner or an admin decides. The ordered list of `approved` rows on a
// node IS its public version history — each `appliedSnapshot` is a restorable
// point and each `changes` is the diff. Exactly one of issueId/caseStudyId is
// set (enforced by a CHECK in custom migration), keyed by `targetKind`.
export const revisions = pgTable(
  'revisions',
  {
    id: serial('id').primaryKey(),
    targetKind: text('target_kind').notNull().$type<RevisionTargetKind>(),
    issueId: integer('issue_id').references(() => issues.id, { onDelete: 'cascade' }),
    caseStudyId: integer('case_study_id').references(() => caseStudies.id, { onDelete: 'cascade' }),
    proposerId: uuid('proposer_id').references(() => users.id, { onDelete: 'set null' }),
    status: text('status').notNull().default('pending').$type<RevisionStatus>(),
    // Only the changed fields (diff of baseSnapshot → proposed).
    changes: jsonb('changes').$type<Record<string, unknown>>().notNull(),
    // Full editable-field snapshot of the node before the change.
    baseSnapshot: jsonb('base_snapshot').$type<Record<string, unknown>>().notNull(),
    // Full editable-field snapshot of the node after the change — filled on approve.
    appliedSnapshot: jsonb('applied_snapshot').$type<Record<string, unknown>>(),
    // Node `updatedAt` at proposal time → cheap "changed since proposed" check.
    baseUpdatedAt: timestamp('base_updated_at', { withTimezone: true }),
    // Proposer rationale / changelog note.
    note: text('note'),
    // AI pre-screen result (Worker). Null verdict = not screened.
    aiVerdict: text('ai_verdict').$type<RevisionAiVerdict>(),
    aiConfidence: numeric('ai_confidence'),
    aiReason: text('ai_reason'),
    decidedById: uuid('decided_by_id').references(() => users.id, { onDelete: 'set null' }),
    decidedByRole: text('decided_by_role').$type<RevisionDecidedByRole>(),
    decisionReason: text('decision_reason'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('revisions_issue_id_idx').on(t.issueId),
    index('revisions_case_study_id_idx').on(t.caseStudyId),
    index('revisions_status_idx').on(t.status),
    index('revisions_proposer_id_idx').on(t.proposerId),
    index('revisions_target_kind_status_idx').on(t.targetKind, t.status),
  ],
)

export const revisionsRelations = relations(revisions, ({ one }) => ({
  issue: one(issues, { fields: [revisions.issueId], references: [issues.id] }),
  caseStudy: one(caseStudies, { fields: [revisions.caseStudyId], references: [caseStudies.id] }),
  proposer: one(users, {
    fields: [revisions.proposerId],
    references: [users.id],
    relationName: 'revisionProposer',
  }),
  decidedBy: one(users, {
    fields: [revisions.decidedById],
    references: [users.id],
    relationName: 'revisionDecidedBy',
  }),
}))

// Who is attached to a node and in what capacity. Replaces single-owner
// `authorId` for permission purposes: a node can have many `owner`s (edit +
// decide rights) and many `collaborator`s (credit only). `authorId` is retained
// on issues/case_studies purely as creator provenance — every creator is also
// seeded as an `owner` row here. Polymorphic like `revisions`: exactly one of
// issueId/caseStudyId is set (CHECK + partial unique indexes in a custom
// migration), keyed by `targetKind`. One row per (node, user).
export const nodeMembers = pgTable(
  'node_members',
  {
    id: serial('id').primaryKey(),
    targetKind: text('target_kind').notNull().$type<RevisionTargetKind>(),
    issueId: integer('issue_id').references(() => issues.id, { onDelete: 'cascade' }),
    caseStudyId: integer('case_study_id').references(() => caseStudies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().$type<NodeMemberRole>(),
    source: text('source').$type<NodeMemberSource>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('node_members_issue_id_idx').on(t.issueId),
    index('node_members_case_study_id_idx').on(t.caseStudyId),
    index('node_members_user_id_idx').on(t.userId),
    index('node_members_role_idx').on(t.role),
  ],
)

export const nodeMembersRelations = relations(nodeMembers, ({ one }) => ({
  issue: one(issues, { fields: [nodeMembers.issueId], references: [issues.id] }),
  caseStudy: one(caseStudies, { fields: [nodeMembers.caseStudyId], references: [caseStudies.id] }),
  user: one(users, { fields: [nodeMembers.userId], references: [users.id] }),
}))
