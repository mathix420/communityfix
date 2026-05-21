// Verifies a 6-digit code previously emailed via /email-pin/send. On success
// the email is marked "verified" in storage for VERIFIED_TTL_MS; the passkey
// register handler consumes that flag in its onSuccess.
export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string, pin?: string }>(event)
  const email = normalizeEmail(body?.email || '')
  const pin = (body?.pin || '').trim()

  if (!/^\d{6}$/.test(pin)) {
    throw createError({ statusCode: 400, message: 'Code must be 6 digits.' })
  }

  await verifyEmailPin(email, pin)
  return { ok: true }
})
