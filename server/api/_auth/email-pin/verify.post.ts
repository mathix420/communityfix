// Verifies a 6-digit code previously emailed via /email-pin/send. On success
// the email is marked "verified" in storage for VERIFIED_TTL_MS; the passkey
// register handler consumes that flag in its onSuccess.
export default defineEventHandler(async (event) => {
  // Bound PIN brute force at the HTTP layer. The per-code attempt counter in
  // verifyEmailPin is a non-atomic KV read-modify-write, so a concurrent burst
  // can slip past the 5-attempt cap; these fixed windows are the hard ceiling.
  await assertRateLimit(event, {
    bucket: 'email_pin_verify_ip',
    identifier: clientIp(event),
    limit: 50,
    windowSec: 600,
  })

  const body = await readBody<{ email?: string; pin?: string }>(event)
  const email = normalizeEmail(body?.email || '')
  const pin = (body?.pin || '').trim()

  if (!/^\d{6}$/.test(pin)) {
    throw createError({ statusCode: 400, message: 'Code must be 6 digits.' })
  }

  await assertRateLimit(event, {
    bucket: 'email_pin_verify_addr',
    identifier: email,
    limit: 10,
    windowSec: 600,
  })

  await verifyEmailPin(email, pin)
  return { ok: true }
})
