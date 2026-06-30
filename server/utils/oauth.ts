import { and, eq, gt, isNull, lte } from 'drizzle-orm'
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
  if (!row) return null

  await db
    .update(oauthTokens)
    .set({ revokedAt: new Date() })
    .where(eq(oauthTokens.tokenHash, row.tokenHash))

  return await issueAccessToken({
    clientId: row.clientId,
    userId: row.userId,
    scope: row.scope,
    withRefresh: true,
  })
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
  const user = await db.query.users.findFirst({ where: eq(users.id, row.userId) })
  if (!user) return null
  return { token: row, user }
}

export async function purgeExpired() {
  const db = useDB()
  const now = new Date()
  await db.delete(oauthCodes).where(lte(oauthCodes.expiresAt, now))
}
