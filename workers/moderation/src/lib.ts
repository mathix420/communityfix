import { and, desc, eq, ne, sql, type SQL } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import * as schema from '../../../server/database/schema'
import {
  auditLogs,
  issues,
  qualificationEndorsements,
  qualifications,
  users,
  votes,
  type AuditLogAction,
  type AuditLogStatus,
  type AuditLogType,
} from '../../../server/database/schema'

export type DB = ReturnType<typeof drizzle<typeof schema>>

export interface Ctx {
  db: DB
  openai: OpenAI
  anthropic: Anthropic
  adminEmails: string
}

export function createDb(connectionString: string): DB {
  const client = postgres(connectionString, { max: 5, fetch_types: false })
  return drizzle(client, { schema })
}

const UNSUPPORTED_SCHEMA_KEYS = new Set([
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'minLength',
  'maxLength',
  'pattern',
  'format',
  'minItems',
  'maxItems',
  'uniqueItems',
  'minProperties',
  'maxProperties',
])

function sanitizeSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(sanitizeSchema)
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(node)) {
      if (UNSUPPORTED_SCHEMA_KEYS.has(k)) continue
      out[k] = sanitizeSchema(v)
    }
    return out
  }
  return node
}

function validateRequired(value: unknown, schema: Record<string, unknown>, context?: string): void {
  const required = Array.isArray(schema.required) ? (schema.required as string[]) : []
  if (required.length === 0) return
  const suffix = context ? ` (${context})` : ''
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`[chatJson] Expected a JSON object${suffix}`)
  }
  for (const key of required) {
    if (!(key in (value as Record<string, unknown>))) {
      throw new Error(`[chatJson] Missing required key "${key}" in model output${suffix}`)
    }
  }
}

export async function chatJson<T>(
  anthropic: Anthropic,
  opts: {
    system: string
    user: string
    schema: Record<string, unknown>
    model?: string
    maxTokens?: number
    temperature?: number
    context?: string
  },
): Promise<T> {
  const res = await anthropic.messages.create({
    model: opts.model ?? 'claude-sonnet-4-6',
    max_tokens: opts.maxTokens ?? 1024,
    ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
    system: opts.system,
    messages: [{ role: 'user', content: opts.user }],
    output_config: {
      format: {
        type: 'json_schema',
        schema: sanitizeSchema(opts.schema) as Record<string, unknown>,
      },
    },
  })

  const block = res.content[0]
  const text = block && block.type === 'text' ? block.text : ''
  if (!text) {
    throw new Error(
      `[chatJson] Empty response from Anthropic${opts.context ? ` (${opts.context})` : ''}`,
    )
  }
  const parsed = JSON.parse(text) as T
  validateRequired(parsed, opts.schema, opts.context)
  return parsed
}

export async function embed(openai: OpenAI, text: string): Promise<number[]> {
  const response = await openai.embeddings.create({ model: 'text-embedding-3-small', input: text })
  return response.data[0]!.embedding
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}

export async function findSimilar<T extends { similarity: number }>(
  db: DB,
  opts: {
    table: string
    columns?: string
    embedding: number[]
    where?: SQL
    limit?: number
    threshold?: number
  },
): Promise<T[]> {
  const vec = toVectorLiteral(opts.embedding)
  const cols = opts.columns ?? 'id'
  const limit = Math.min(Math.max(opts.limit ?? 5, 1), 25)
  const where = opts.where ?? sql`TRUE`

  const results = await db.execute<T>(
    sql`SELECT ${sql.raw(cols)}, 1 - (embedding <=> ${vec}::vector) AS similarity
        FROM ${sql.raw(opts.table)}
        WHERE embedding IS NOT NULL AND ${where}
        ORDER BY embedding <=> ${vec}::vector
        LIMIT ${limit}`,
  )
  const rows = results as unknown as T[]
  return opts.threshold != null ? rows.filter((r) => r.similarity > opts.threshold!) : rows
}

export async function createAuditLog(
  db: DB,
  entry: {
    type: AuditLogType
    action: AuditLogAction
    status?: AuditLogStatus
    issueId?: number | null
    userId?: string | null
    reason?: string | null
    details?: Record<string, unknown> | null
  },
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      type: entry.type,
      action: entry.action,
      status: entry.status ?? 'auto_resolved',
      issueId: entry.issueId ?? null,
      userId: entry.userId ?? null,
      reason: entry.reason ?? null,
      details: entry.details ?? null,
    })
  } catch (err) {
    console.error('[audit-log] Failed to write audit log:', err)
  }
}

export function isAdminEmail(email: string | null | undefined, adminEmails: string): boolean {
  if (!email) return false
  const allowed = (adminEmails || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(email.toLowerCase())
}

interface TrustScoreFactors {
  isAdmin: boolean
  accountAgeDays: number
  approvedCount: number
  rejectedCount: number
  solutionCount: number
  totalVotesReceived: number
  votesCast: number
  verifiedCredentials: number
  wasBanned: boolean
}

export function computeScore(f: TrustScoreFactors): number {
  if (f.isAdmin) return 100
  const agePts = Math.min(15, (15 * Math.log1p(f.accountAgeDays)) / Math.log1p(365))
  const contribPts = Math.min(30, (30 * Math.log1p(f.approvedCount)) / Math.log1p(50))
  const totalSubmissions = f.approvedCount + f.rejectedCount
  const approvalRate = totalSubmissions > 0 ? f.approvedCount / totalSubmissions : 1
  const approvalPts = totalSubmissions > 0 ? 15 * approvalRate : 0
  const votePts =
    f.totalVotesReceived > 0
      ? Math.min(20, (20 * Math.log1p(f.totalVotesReceived)) / Math.log1p(200))
      : Math.max(-10, f.totalVotesReceived)
  const solutionPts = Math.min(10, (10 * Math.log1p(f.solutionCount)) / Math.log1p(20))
  const engagementPts = Math.min(10, (10 * Math.log1p(f.votesCast)) / Math.log1p(100))
  const verifiedPts =
    f.verifiedCredentials > 0 ? Math.min(30, 20 + (f.verifiedCredentials - 1) * 5) : 0
  const banPenalty = f.wasBanned ? -20 : 0
  const raw =
    agePts +
    contribPts +
    approvalPts +
    votePts +
    solutionPts +
    engagementPts +
    verifiedPts +
    banPenalty
  return Math.round(Math.max(0, Math.min(100, raw)))
}

async function computeUserTrustScore(ctx: Ctx, userId: string): Promise<number> {
  const { db } = ctx
  const [stats, voteStats, engagementStats, verifiedStats] = await Promise.all([
    db
      .select({
        email: users.email,
        createdAt: users.createdAt,
        bannedUntil: users.bannedUntil,
        approvedCount: sql<number>`COUNT(*) FILTER (WHERE ${issues.status} = 'approved')`.as(
          'approved_count',
        ),
        rejectedCount: sql<number>`COUNT(*) FILTER (WHERE ${issues.status} = 'rejected')`.as(
          'rejected_count',
        ),
        solutionCount:
          sql<number>`COUNT(*) FILTER (WHERE ${issues.status} = 'approved' AND ${issues.type} = 'solution')`.as(
            'solution_count',
          ),
      })
      .from(users)
      .leftJoin(issues, eq(issues.authorId, users.id))
      .where(eq(users.id, userId))
      .groupBy(users.id),
    db
      .select({
        totalVotes: sql<number>`COALESCE(SUM(${votes.value} * ${votes.weight}), 0)`.as(
          'total_votes',
        ),
      })
      .from(votes)
      .innerJoin(
        issues,
        and(
          eq(votes.issueId, issues.id),
          eq(issues.authorId, userId),
          ne(issues.status, 'rejected'),
        ),
      ),
    db
      .select({ votesCast: sql<number>`COUNT(*)`.as('votes_cast') })
      .from(votes)
      .where(eq(votes.userId, userId)),
    db
      .select({
        verifiedCount: sql<number>`COUNT(DISTINCT ${qualifications.id})`.as('verified_count'),
      })
      .from(qualifications)
      .innerJoin(
        qualificationEndorsements,
        and(
          eq(qualificationEndorsements.qualificationId, qualifications.id),
          eq(qualificationEndorsements.kind, 'verification'),
        ),
      )
      .where(eq(qualifications.userId, userId)),
  ])

  if (!stats[0]) return 0
  const row = stats[0]
  const accountAgeDays = Math.floor(
    (Date.now() - new Date(row.createdAt).getTime()) / (1000 * 60 * 60 * 24),
  )
  return computeScore({
    isAdmin: isAdminEmail(row.email, ctx.adminEmails),
    accountAgeDays,
    approvedCount: Number(row.approvedCount),
    rejectedCount: Number(row.rejectedCount),
    solutionCount: Number(row.solutionCount),
    totalVotesReceived: Number(voteStats[0]?.totalVotes ?? 0),
    votesCast: Number(engagementStats[0]?.votesCast ?? 0),
    verifiedCredentials: Number(verifiedStats[0]?.verifiedCount ?? 0),
    wasBanned: row.bannedUntil !== null,
  })
}

export async function updateUserTrustScore(ctx: Ctx, userId: string): Promise<number> {
  const { db } = ctx
  const current = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { trustScore: true },
  })
  const oldScore = current?.trustScore ?? 0
  const score = await computeUserTrustScore(ctx, userId)
  await db
    .update(users)
    .set({ trustScore: score, trustScoreUpdatedAt: new Date() })
    .where(eq(users.id, userId))
  if (score !== oldScore) {
    await createAuditLog(db, {
      type: 'trust_score',
      action: 'score_update',
      userId,
      details: { oldScore, newScore: score },
    })
  }
  return score
}

const BAN_REJECTION_THRESHOLD = 4
const BAN_LOOKBACK_WINDOW = 10

function computeBanExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000)
}

export async function checkAndApplyBan(db: DB, userId: string): Promise<void> {
  const recentPosts = await db.query.issues.findMany({
    where: eq(issues.authorId, userId),
    orderBy: desc(issues.createdAt),
    limit: BAN_LOOKBACK_WINDOW,
    columns: { status: true },
  })
  const rejectedCount = recentPosts.filter((p) => p.status === 'rejected').length
  if (rejectedCount < BAN_REJECTION_THRESHOLD) return

  const bannedUntil = computeBanExpiry()
  await db
    .update(users)
    .set({
      bannedUntil,
      banReason: `Automatically banned: ${rejectedCount} of your last ${recentPosts.length} posts were rejected by moderation.`,
      banAppealedAt: null,
      banAppealStatus: null,
    })
    .where(eq(users.id, userId))
  await createAuditLog(db, {
    type: 'auto_ban',
    action: 'ban',
    status: 'needs_review',
    userId,
    reason: `Automatically banned: ${rejectedCount} of last ${recentPosts.length} posts rejected`,
    details: {
      rejectedCount,
      lookbackWindow: recentPosts.length,
      bannedUntil: bannedUntil.toISOString(),
    },
  })
}
