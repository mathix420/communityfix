import type { H3Event } from 'h3'

// Both limiters in this module keep their counters in the `auth` KV namespace
// (Cloudflare KV in prod, in-memory in dev — see `nitro.storage` in
// nuxt.config.ts). KV is per-region and eventually consistent, so both are
// best-effort: counts can drift slightly under concurrency, which is fine for
// abuse protection.
const KV_NAMESPACE = 'auth'
// Cloudflare KV refuses an expirationTtl below 60s, so never ask for less.
const MIN_TTL_SEC = 60

// ── Fixed-window limiter ────────────────────────────────────────────────────
// Per-(bucket, identifier) request counter used by the OAuth endpoints and the
// MCP server. Each window-start is folded into the key so windows are
// independent rows; the row's TTL is the window length, so KV evicts stale
// windows on its own (no purge task needed).

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: Date
}

/**
 * Fixed-window rate limiter backed by KV.
 *
 * KV has no atomic increment, so the counter is a read-modify-write: under a
 * burst of truly concurrent requests it can slightly under-count (KV is also
 * eventually consistent), which only ever makes the limiter more permissive.
 *
 * This is abuse protection, not authorization, so it **fails open**: if the KV
 * read/write throws (outage, transient error), we log and allow the request
 * rather than turning a KV blip into an auth/MCP outage. A bypass during a KV
 * incident is the lesser evil versus denying every login and tool call.
 */
export async function rateLimit(opts: {
  bucket: string
  identifier: string
  limit: number
  windowSec: number
}): Promise<RateLimitResult> {
  const { bucket, identifier, limit, windowSec } = opts
  const windowMs = windowSec * 1000
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs
  const key = `ratelimit:${bucket}:${identifier}:${windowStart}`
  const resetAt = new Date(windowStart + windowMs)

  let count: number
  try {
    const storage = useStorage(KV_NAMESPACE)
    count = ((await storage.getItem<number>(key)) ?? 0) + 1
    await storage.setItem(key, count, { ttl: Math.max(MIN_TTL_SEC, windowSec) })
  } catch (err) {
    console.error('[rate-limit] KV unavailable, failing open:', { bucket, key, err })
    return { allowed: true, limit, remaining: limit, resetAt }
  }

  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt,
  }
}

/** Best-effort caller identity for unauthenticated endpoints. */
export function clientIp(event: H3Event): string {
  return (
    getRequestHeader(event, 'cf-connecting-ip') ??
    getRequestIP(event, { xForwardedFor: true }) ??
    'unknown'
  )
}

/**
 * Enforce a rate limit, setting standard `RateLimit-*` headers and throwing a
 * 429 with `Retry-After` when the window is exhausted. Returns on success.
 */
export async function assertRateLimit(
  event: H3Event,
  opts: {
    bucket: string
    identifier: string
    limit: number
    windowSec: number
  },
): Promise<void> {
  const result = await rateLimit(opts)
  setHeader(event, 'RateLimit-Limit', String(result.limit))
  setHeader(event, 'RateLimit-Remaining', String(result.remaining))
  setHeader(
    event,
    'RateLimit-Reset',
    String(Math.max(0, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000))),
  )
  if (!result.allowed) {
    const retryAfter = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000))
    setHeader(event, 'Retry-After', retryAfter)
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      data: {
        error: 'rate_limited',
        error_description: `Rate limit exceeded. Retry in ${retryAfter}s.`,
      },
    })
  }
}

// ── Proposal sliding-window limiter ─────────────────────────────────────────
// Per-user cap on revision proposals — stops a single account from flooding
// owners (and the AI pre-screen). A small sliding window of recent proposal
// timestamps kept in KV, pruned on each check. Reused by the REST `PATCH`
// endpoints and the MCP propose paths.

// How many proposals a user may create per window.
export const PROPOSAL_RATE_LIMIT = 20
// Sliding window length (24h).
export const PROPOSAL_RATE_WINDOW_MS = 24 * 60 * 60 * 1000

function proposalKey(userId: string) {
  return `proposal-rate:${userId}`
}

/**
 * Throws a 429 when the user has already created `PROPOSAL_RATE_LIMIT`
 * proposals within the trailing `PROPOSAL_RATE_WINDOW_MS`. Otherwise records
 * the current attempt and returns. Best treated as advisory — KV is per-region
 * and not strongly consistent — but it's enough to blunt abuse.
 */
export async function checkProposalRateLimit(userId: string): Promise<void> {
  const storage = useStorage(KV_NAMESPACE)
  const key = proposalKey(userId)
  const now = Date.now()

  const recent = (await storage.getItem<number[]>(key)) ?? []
  const windowed = recent.filter((ts) => now - ts < PROPOSAL_RATE_WINDOW_MS)

  if (windowed.length >= PROPOSAL_RATE_LIMIT) {
    throw createError({
      statusCode: 429,
      message: `You can propose at most ${PROPOSAL_RATE_LIMIT} edits per day. Try again later.`,
    })
  }

  windowed.push(now)
  await storage.setItem(key, windowed)
}
