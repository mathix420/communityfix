import { and, eq, gt, isNotNull, isNull, lte, or } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { oauthClients, oauthCodes, oauthTokens, users } from '../database/schema'

// Tokens are stored hashed so a DB dump never exposes a usable bearer.
const ACCESS_TOKEN_TTL_SEC = 60 * 60
const REFRESH_TOKEN_TTL_SEC = 60 * 60 * 24 * 30
const CODE_TTL_SEC = 60 * 5

export const OAUTH_SCOPE = 'mcp'

export function getOrigin(event: H3Event): string {
  const proto = getRequestHeader(event, 'x-forwarded-proto') ?? 'https'
  const host = getRequestHeader(event, 'x-forwarded-host') ?? getRequestHeader(event, 'host')
  if (!host) throw createError({ statusCode: 500, statusMessage: 'Missing Host header' })
  return `${proto}://${host}`
}

// Canonical RFC 8707 resource identifier for the MCP endpoint. Tokens are
// audience-bound to this value so they can't be replayed at another resource.
export function mcpResource(event: H3Event): string {
  return `${getOrigin(event)}/api/mcp`
}

function normalizeResource(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  let s = ''
  for (const b of arr) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function verifyPkce(
  verifier: string,
  challenge: string,
  method: string,
): Promise<boolean> {
  if (method !== 'S256') return false
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const computed = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return computed === challenge
}

export async function getClient(clientId: string) {
  const db = useDB()
  return await db.query.oauthClients.findFirst({ where: eq(oauthClients.id, clientId) })
}

export async function issueAuthorizationCode(params: {
  clientId: string
  userId: string
  redirectUri: string
  codeChallenge: string
  codeChallengeMethod: string
  scope: string
  resource?: string | null
}): Promise<string> {
  const db = useDB()
  const code = randomToken(32)
  await db.insert(oauthCodes).values({
    code,
    clientId: params.clientId,
    userId: params.userId,
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge,
    codeChallengeMethod: params.codeChallengeMethod,
    scope: params.scope,
    resource: params.resource ?? null,
    expiresAt: new Date(Date.now() + CODE_TTL_SEC * 1000),
  })
  return code
}

export async function consumeAuthorizationCode(code: string) {
  const db = useDB()
  // Single-use: marked consumed in the same UPDATE so a replay matches nothing.
  const rows = await db
    .update(oauthCodes)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(oauthCodes.code, code),
        isNull(oauthCodes.consumedAt),
        gt(oauthCodes.expiresAt, new Date()),
      ),
    )
    .returning()
  return rows[0] ?? null
}

export async function issueAccessToken(params: {
  clientId: string
  userId: string
  scope: string
  resource?: string | null
  withRefresh?: boolean
}): Promise<{ accessToken: string; refreshToken: string | null; expiresIn: number }> {
  const db = useDB()
  const accessToken = randomToken(32)
  const refreshToken = params.withRefresh ? randomToken(32) : null
  await db.insert(oauthTokens).values({
    tokenHash: await sha256Hex(accessToken),
    clientId: params.clientId,
    userId: params.userId,
    scope: params.scope,
    resource: params.resource ?? null,
    refreshHash: refreshToken ? await sha256Hex(refreshToken) : null,
    expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_SEC * 1000),
  })
  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SEC }
}

export async function rotateRefreshToken(refreshToken: string) {
  const db = useDB()
  const refreshHash = await sha256Hex(refreshToken)
  const row = await db.query.oauthTokens.findFirst({
    where: and(
      eq(oauthTokens.refreshHash, refreshHash),
      isNull(oauthTokens.revokedAt),
      gt(oauthTokens.expiresAt, new Date(Date.now() - REFRESH_TOKEN_TTL_SEC * 1000)),
    ),
  })
  if (!row) {
    // Reuse detection: a refresh token we already rotated (its row is revoked)
    // being presented again is a theft signal — revoke the whole token family
    // for that client+user so a leaked token can't be milked.
    const reused = await db.query.oauthTokens.findFirst({
      where: and(eq(oauthTokens.refreshHash, refreshHash), isNotNull(oauthTokens.revokedAt)),
    })
    if (reused) {
      await db.update(oauthTokens)
        .set({ revokedAt: new Date() })
        .where(and(
          eq(oauthTokens.clientId, reused.clientId),
          eq(oauthTokens.userId, reused.userId),
          isNull(oauthTokens.revokedAt),
        ))
      console.warn(`[oauth] refresh-token reuse detected — revoked token family for client=${reused.clientId} user=${reused.userId}`)
    }
    return null
  }

  await db
    .update(oauthTokens)
    .set({ revokedAt: new Date() })
    .where(eq(oauthTokens.tokenHash, row.tokenHash))

  return await issueAccessToken({
    clientId: row.clientId,
    userId: row.userId,
    scope: row.scope,
    resource: row.resource,
    withRefresh: true,
  })
}

// RFC 7009 token revocation. Accepts either an access token (tokenHash) or a
// refresh token (refreshHash). Idempotent and silent on unknown tokens.
export async function revokeToken(raw: string): Promise<boolean> {
  const db = useDB()
  const hash = await sha256Hex(raw)
  const now = new Date()
  const asAccess = await db.update(oauthTokens)
    .set({ revokedAt: now })
    .where(and(eq(oauthTokens.tokenHash, hash), isNull(oauthTokens.revokedAt)))
    .returning({ tokenHash: oauthTokens.tokenHash })
  if (asAccess.length) return true
  const asRefresh = await db.update(oauthTokens)
    .set({ revokedAt: now })
    .where(and(eq(oauthTokens.refreshHash, hash), isNull(oauthTokens.revokedAt)))
    .returning({ tokenHash: oauthTokens.tokenHash })
  return asRefresh.length > 0
}

export async function authenticateBearer(event: H3Event) {
  const header = getRequestHeader(event, 'authorization') ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  if (!match) return null
  const token = match[1]!
  const db = useDB()
  const row = await db.query.oauthTokens.findFirst({
    where: and(
      eq(oauthTokens.tokenHash, await sha256Hex(token)),
      isNull(oauthTokens.revokedAt),
      gt(oauthTokens.expiresAt, new Date()),
    ),
  })
  if (!row) return null
  // RFC 8707: reject a token minted for a different resource (audience). Legacy
  // tokens with no bound resource are still accepted for backward compatibility.
  if (row.resource && normalizeResource(row.resource) !== normalizeResource(mcpResource(event))) {
    return null
  }
  const user = await db.query.users.findFirst({ where: eq(users.id, row.userId) })
  if (!user) return null
  return { token: row, user }
}

// Reaps stale OAuth rows so the tables don't grow unbounded. Called from the
// `oauth:purge` scheduled task. Revoked/expired token rows are kept until the
// refresh window closes so refresh-reuse detection still works. (Rate-limit
// counters live in KV and expire on their own TTL, so they need no purge.)
export async function purgeExpired() {
  const db = useDB()
  const now = new Date()
  const refreshCutoff = new Date(now.getTime() - REFRESH_TOKEN_TTL_SEC * 1000)

  const codes = await db.delete(oauthCodes)
    .where(lte(oauthCodes.expiresAt, now))
    .returning({ code: oauthCodes.code })
  const tokens = await db.delete(oauthTokens)
    .where(or(
      lte(oauthTokens.expiresAt, refreshCutoff),
      and(isNotNull(oauthTokens.revokedAt), lte(oauthTokens.revokedAt, refreshCutoff)),
    ))
    .returning({ tokenHash: oauthTokens.tokenHash })

  return { codes: codes.length, tokens: tokens.length }
}

// --- Consent CSRF token --------------------------------------------------
// Stateless, HMAC-signed token binding a consent form to the exact
// (user, client, redirect) it was rendered for. Defends the approval POST
// against cross-site forgery beyond the session cookie's SameSite protection.

function consentSecret(): string {
  const secret = (useRuntimeConfig() as { session?: { password?: string } }).session?.password
    ?? process.env.NUXT_SESSION_PASSWORD
  if (!secret) throw createError({ statusCode: 500, statusMessage: 'Session secret is not configured' })
  return secret
}

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('')
}

export interface ConsentBinding {
  userId: string
  clientId: string
  redirectUri: string
}

export async function issueConsentToken(b: ConsentBinding): Promise<string> {
  return hmacHex(consentSecret(), `${b.userId}|${b.clientId}|${b.redirectUri}`)
}

export async function verifyConsentToken(token: string, b: ConsentBinding): Promise<boolean> {
  const expected = await issueConsentToken(b)
  if (token.length !== expected.length) return false
  // Constant-time compare to avoid leaking the signature byte-by-byte.
  let diff = 0
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}
