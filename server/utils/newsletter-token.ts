// Stateless unsubscribe tokens for newsletter emails. The link must work for
// a logged-out recipient, so the token itself proves the request is for the
// right account: an HMAC over the user id, keyed on the session password
// (same secret strategy as the OAuth consent CSRF token in oauth.ts).
// Deliberately non-expiring — an unsubscribe link at the bottom of an old
// email should keep working.

function unsubscribeSecret(): string {
  const secret =
    (useRuntimeConfig() as { session?: { password?: string } }).session?.password ??
    process.env.NUXT_SESSION_PASSWORD
  if (!secret)
    throw createError({ statusCode: 500, statusMessage: 'Session secret is not configured' })
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
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Token format: `<userId>.<hmacHex>` — the id is public, the sig binds it. */
export async function issueUnsubscribeToken(userId: string): Promise<string> {
  return `${userId}.${await hmacHex(unsubscribeSecret(), `newsletter-unsub|${userId}`)}`
}

/** Returns the user id the token was issued for, or null when invalid. */
export async function verifyUnsubscribeToken(token: string): Promise<string | null> {
  const dot = token.indexOf('.')
  if (dot <= 0) return null
  const userId = token.slice(0, dot)
  const expected = await issueUnsubscribeToken(userId)
  if (token.length !== expected.length) return null
  // Constant-time compare to avoid leaking the signature byte-by-byte.
  let diff = 0
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0 ? userId : null
}
