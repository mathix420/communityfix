import { pgTable, text, integer, serial, boolean, timestamp, uuid, jsonb, primaryKey, unique, index } from 'drizzle-orm/pg-core'
import { vector } from 'drizzle-orm/pg-core'
import { geometry } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ── Shared type constants ─────────────────────────────
export const PROVIDERS = ['google', 'apple', 'passkey'] as const
export type Provider = typeof PROVIDERS[number]

export const ISSUE_STATUSES = ['pending', 'approved', 'rejected'] as const
export type IssueStatus = typeof ISSUE_STATUSES[number]

export const ISSUE_TYPES = ['issue', 'solution'] as const
export type IssueType = typeof ISSUE_TYPES[number]

export const APPEAL_STATUSES = ['pending', 'approved', 'denied'] as const
export type AppealStatus = typeof APPEAL_STATUSES[number]

export const LOCATION_SCALES = ['neighborhood', 'city', 'region', 'national', 'global'] as const
export type LocationScale = typeof LOCATION_SCALES[number]

export const SOLUTION_STATUSES = ['plan', 'in-progress', 'done'] as const
export type SolutionStatus = typeof SOLUTION_STATUSES[number]

// ── Users ──────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
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
}))

// ── Credentials (WebAuthn) ─────────────────────────────
export const credentials = pgTable('credentials', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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

// ── SDGs ───────────────────────────────────────────────
export const sdgs = pgTable('sdgs', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  iconUrl: text('icon_url').notNull(),
  link: text('link').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── Tags ───────────────────────────────────────────────
export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── Issues ─────────────────────────────────────────────
export const issues = pgTable('issues', {
  id: serial('id').primaryKey(),
  parentId: integer('parent_id').references((): any => issues.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  detailedDescription: text('detailed_description'),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  authorName: text('author_name'),
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
  // Location (PostGIS)
  locationName: text('location_name'),
  location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }),
  scale: text('scale').$type<LocationScale>(),
  // Solution lifecycle (only meaningful when type='solution')
  solutionStatus: text('solution_status').$type<SolutionStatus>(),
  // Embeddings (pgvector)
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const issuesRelations = relations(issues, ({ one, many }) => ({
  author: one(users, { fields: [issues.authorId], references: [users.id] }),
  parent: one(issues, { fields: [issues.parentId], references: [issues.id], relationName: 'parentChild' }),
  children: many(issues, { relationName: 'parentChild' }),
  issueTags: many(issueTags),
  issueSdgs: many(issueSdgs),
  votes: many(votes),
}))

// ── Votes ──────────────────────────────────────────────
export const votes = pgTable('votes', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  issueId: integer('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  value: integer('value').notNull(), // +1 or -1
  weight: integer('weight').notNull().default(1), // derived from voter's trust score
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  unique().on(t.userId, t.issueId),
])

export const votesRelations = relations(votes, ({ one }) => ({
  user: one(users, { fields: [votes.userId], references: [users.id] }),
  issue: one(issues, { fields: [votes.issueId], references: [issues.id] }),
}))

// ── Issue ↔ Tag junction ───────────────────────────────
export const issueTags = pgTable('issue_tags', {
  issueId: integer('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  primaryKey({ columns: [t.issueId, t.tagId] }),
])

export const issueTagsRelations = relations(issueTags, ({ one }) => ({
  issue: one(issues, { fields: [issueTags.issueId], references: [issues.id] }),
  tag: one(tags, { fields: [issueTags.tagId], references: [tags.id] }),
}))

// ── Issue ↔ SDG junction ──────────────────────────────
export const issueSdgs = pgTable('issue_sdgs', {
  issueId: integer('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  sdgId: integer('sdg_id').notNull().references(() => sdgs.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  primaryKey({ columns: [t.issueId, t.sdgId] }),
])

export const issueSdgsRelations = relations(issueSdgs, ({ one }) => ({
  issue: one(issues, { fields: [issueSdgs.issueId], references: [issues.id] }),
  sdg: one(sdgs, { fields: [issueSdgs.sdgId], references: [sdgs.id] }),
}))
