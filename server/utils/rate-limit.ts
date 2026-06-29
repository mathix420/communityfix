import { sql } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { rateLimits } from '../database/schema'

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: Date
}

/**
 * Fixed-window rate limiter backed by the `rate_limits` table.
 *
 * One row per (bucket, identifier, window-start). The window start is folded
 * into the key so each window is an independent row, and the counter is bumped
 * with an atomic upsert (`INSERT … ON CONFLICT DO UPDATE … RETURNING`) so
 * concurrent requests can't race a read-modify-write. Portable across dev,
 * test, and the Cloudflare Worker — no platform-specific binding required.
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
  const key = `${bucket}:${identifier}:${windowStart}`
  const expiresAt = new Date(windowStart + windowMs)

  const db = useDB()
  const rows = await db
    .insert(rateLimits)
    .values({ key, count: 1, expiresAt })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count })

  const count = rows[0]?.count ?? 1
  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt: expiresAt,
  }
}

/** Best-effort caller identity for unauthenticated endpoints. */
export function clientIp(event: H3Event): string {
  return getRequestHeader(event, 'cf-connecting-ip')
    ?? getRequestIP(event, { xForwardedFor: true })
    ?? 'unknown'
}

/**
 * Enforce a rate limit, setting standard `RateLimit-*` headers and throwing a
 * 429 with `Retry-After` when the window is exhausted. Returns on success.
 */
export async function assertRateLimit(event: H3Event, opts: {
  bucket: string
  identifier: string
  limit: number
  windowSec: number
}): Promise<void> {
  const result = await rateLimit(opts)
  setHeader(event, 'RateLimit-Limit', String(result.limit))
  setHeader(event, 'RateLimit-Remaining', String(result.remaining))
  setHeader(event, 'RateLimit-Reset', String(Math.max(0, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000))))
  if (!result.allowed) {
    const retryAfter = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000))
    setHeader(event, 'Retry-After', retryAfter)
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      data: { error: 'rate_limited', error_description: `Rate limit exceeded. Retry in ${retryAfter}s.` },
    })
  }
}
