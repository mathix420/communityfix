// Issues a 6-digit verification code by email. Used by passkey registration
// to prove the registrant controls the email before a credential is attached
// to it. Bound to the normalized email — see verify.post.ts to consume.
export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string }>(event)
  const email = normalizeEmail(body?.email || '')

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
