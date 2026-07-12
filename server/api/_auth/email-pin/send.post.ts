// Issues a 6-digit verification code by email. Used by passkey registration
// to prove the registrant controls the email before a credential is attached
// to it. Bound to the normalized email — see verify.post.ts to consume.
export default defineEventHandler(async (event) => {
  // Unauthenticated and sends real email, so throttle hard by IP to stop a
  // single source from fanning codes out to many addresses (mail flood / spam
  // relay). The per-email 60s cooldown in issueEmailPin does not bound fan-out
  // across distinct recipients — this does.
  await assertRateLimit(event, {
    bucket: 'email_pin_send_ip',
    identifier: clientIp(event),
    limit: 10,
    windowSec: 3600,
  })

  const body = await readBody<{ email?: string }>(event)
  const email = normalizeEmail(body?.email || '')

  // Per-recipient cap over a longer window (belt to the 60s reissue cooldown).
  await assertRateLimit(event, {
    bucket: 'email_pin_send_addr',
    identifier: email,
    limit: 5,
    windowSec: 3600,
  })

  // If an account already exists for this email AND the requester isn't
  // signed in as that user, refuse to email a code. This mirrors the
  // takeover gate in webauthn/register and avoids leaking that the email
  // is in use only at the WebAuthn step (a code request that always
  // succeeds would be an enumeration oracle).
  const session = await getUserSession(event)
  const existing = await getUserByEmail(email)
  if (existing && session.user?.id !== existing.id) {
    throw createError({
      statusCode: 409,
      message: 'An account already exists for this email. Sign in with your existing method first.',
    })
  }

  await issueEmailPin(event, email)
  return { ok: true }
})
