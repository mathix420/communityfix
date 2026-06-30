import type { H3Event } from 'h3'

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: Date
}

// Fixed-window counters live in the `auth` KV namespace (Cloudflare KV in prod,
// in-memory in dev — see `nitro.storage` in nuxt.config.ts). Each window-start
// is folded into the key so windows are independent rows; the row's TTL is the
// window length, so KV evicts stale windows on its own (no purge task needed).
const KV_NAMESPACE = 'auth'
// Cloudflare KV refuses an expirationTtl below 60s, so never ask for less.
const MIN_TTL_SEC = 60

/**
 * Fixed-window rate limiter backed by KV.
 *
 * KV has no atomic increment, so the counter is a read-modify-write: under a
 * burst of truly concurrent requests it can slightly under-count (KV is also
 * eventually consistent), which only ever makes the limiter more permissive —
 * acceptable for abuse protection, and the failure mode never wrongly blocks.
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

  const storage = useStorage(KV_NAMESPACE)
  const count = ((await storage.getItem<number>(key)) ?? 0) + 1
  await storage.setItem(key, count, { ttl: Math.max(MIN_TTL_SEC, windowSec) })

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
