import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'
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

// ── Users ──────────────────────────────────────────────
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name'),
  provider: text('provider').$type<Provider>(),
  bannedUntil: text('banned_until'),
  banReason: text('ban_reason'),
  banAppealedAt: text('ban_appealed_at'),
  banAppealStatus: text('ban_appeal_status').$type<AppealStatus>(),
  banAppealReason: text('ban_appeal_reason'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const usersRelations = relations(users, ({ many }) => ({
  credentials: many(credentials),
  issues: many(issues),
}))

// ── Credentials (WebAuthn) ─────────────────────────────
export const credentials = sqliteTable('credentials', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  publicKey: text('public_key').notNull(),
  counter: integer('counter').notNull().default(0),
  backedUp: integer('backed_up', { mode: 'boolean' }).notNull().default(false),
  transports: text('transports', { mode: 'json' }).$type<string[]>().notNull().default([]),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const credentialsRelations = relations(credentials, ({ one }) => ({
  user: one(users, { fields: [credentials.userId], references: [users.id] }),
}))

// ── SDGs ───────────────────────────────────────────────
export const sdgs = sqliteTable('sdgs', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  iconUrl: text('icon_url').notNull(),
  link: text('link').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ── Tags ───────────────────────────────────────────────
export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ── Issues ─────────────────────────────────────────────
export const issues = sqliteTable('issues', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  parentId: integer('parent_id').references((): any => issues.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  detailedDescription: text('detailed_description'),
  authorId: text('author_id').references(() => users.id, { onDelete: 'set null' }),
  authorName: text('author_name'),
  solutionCount: integer('solution_count').notNull().default(0),
  subIssueCount: integer('sub_issue_count').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  sourceCount: integer('source_count').notNull().default(0),
  status: text('status').notNull().default('pending').$type<IssueStatus>(),
  type: text('type').notNull().default('issue').$type<IssueType>(),
  rejectionReason: text('rejection_reason'),
  rejectedAt: text('rejected_at'),
  isSpam: integer('is_spam', { mode: 'boolean' }).notNull().default(false),
  appealReason: text('appeal_reason'),
  appealStatus: text('appeal_status').$type<AppealStatus>(),
  appealedAt: text('appealed_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const issuesRelations = relations(issues, ({ one, many }) => ({
  author: one(users, { fields: [issues.authorId], references: [users.id] }),
  parent: one(issues, { fields: [issues.parentId], references: [issues.id], relationName: 'parentChild' }),
  children: many(issues, { relationName: 'parentChild' }),
  issueTags: many(issueTags),
  issueSdgs: many(issueSdgs),
}))

// ── Issue ↔ Tag junction ───────────────────────────────
export const issueTags = sqliteTable('issue_tags', {
  issueId: integer('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, t => [
  primaryKey({ columns: [t.issueId, t.tagId] }),
])

export const issueTagsRelations = relations(issueTags, ({ one }) => ({
  issue: one(issues, { fields: [issueTags.issueId], references: [issues.id] }),
  tag: one(tags, { fields: [issueTags.tagId], references: [tags.id] }),
}))

// ── Issue ↔ SDG junction ──────────────────────────────
export const issueSdgs = sqliteTable('issue_sdgs', {
  issueId: integer('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  sdgId: integer('sdg_id').notNull().references(() => sdgs.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, t => [
  primaryKey({ columns: [t.issueId, t.sdgId] }),
])

export const issueSdgsRelations = relations(issueSdgs, ({ one }) => ({
  issue: one(issues, { fields: [issueSdgs.issueId], references: [issues.id] }),
  sdg: one(sdgs, { fields: [issueSdgs.sdgId], references: [sdgs.id] }),
}))
