import type { H3Event } from 'h3'
import { sendEmail } from './email'

const PIN_TTL_MS = 10 * 60 * 1000
const VERIFIED_TTL_MS = 10 * 60 * 1000
const REISSUE_COOLDOWN_MS = 60 * 1000
const MAX_ATTEMPTS = 5

interface PinRecord {
  pin: string
  attempts: number
  issuedAt: number
  expiresAt: number
}

interface VerifiedRecord {
  verifiedAt: number
  expiresAt: number
}

function pinKey(email: string) { return `email-pin:${email}` }
function verifiedKey(email: string) { return `email-verified:${email}` }

function generatePin(): string {
  // 6-digit, leading zeros allowed. Math.random is fine for one-shot
  // codes scoped to a short TTL + low attempt cap; not a long-lived secret.
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
}

export async function issueEmailPin(event: H3Event, email: string): Promise<void> {
  const storage = useStorage('auth')
  const existing = await storage.getItem<PinRecord>(pinKey(email))
  if (existing && Date.now() - existing.issuedAt < REISSUE_COOLDOWN_MS) {
    throw createError({
      statusCode: 429,
      message: 'A code was just sent. Wait a minute before requesting another.',
    })
  }

  const pin = generatePin()
  const now = Date.now()
  await storage.setItem(pinKey(email), {
    pin,
    attempts: 0,
    issuedAt: now,
    expiresAt: now + PIN_TTL_MS,
  } satisfies PinRecord)

  await sendEmail(event, {
    to: email,
    subject: 'Your CommunityFix verification code',
    html: `
      <p>Hi,</p>
      <p>Your CommunityFix verification code is:</p>
      <p style="font-family:monospace;font-size:24px;letter-spacing:4px;font-weight:600;">${pin}</p>
      <p>It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    `,
  })
}

export async function verifyEmailPin(email: string, pin: string): Promise<void> {
  const storage = useStorage('auth')
  const record = await storage.getItem<PinRecord>(pinKey(email))

  if (!record) {
    throw createError({ statusCode: 400, message: 'No verification code requested or it has expired.' })
  }
  if (Date.now() > record.expiresAt) {
    await storage.removeItem(pinKey(email))
    throw createError({ statusCode: 400, message: 'Verification code expired. Request a new one.' })
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    await storage.removeItem(pinKey(email))
    throw createError({ statusCode: 429, message: 'Too many attempts. Request a new code.' })
  }
  if (record.pin !== pin) {
    await storage.setItem(pinKey(email), { ...record, attempts: record.attempts + 1 })
    throw createError({ statusCode: 400, message: 'Invalid code.' })
  }

  await storage.removeItem(pinKey(email))
  const now = Date.now()
  await storage.setItem(verifiedKey(email), {
    verifiedAt: now,
    expiresAt: now + VERIFIED_TTL_MS,
  } satisfies VerifiedRecord)
}

// True if the email has a fresh "verified" flag. Does NOT consume it — call
// consumeEmailVerification once you've committed to using the verification.
export async function hasEmailVerification(email: string): Promise<boolean> {
  const storage = useStorage('auth')
  const record = await storage.getItem<VerifiedRecord>(verifiedKey(email))
  if (!record) return false
  if (Date.now() > record.expiresAt) {
    await storage.removeItem(verifiedKey(email))
    return false
  }
  return true
}

export async function consumeEmailVerification(email: string): Promise<boolean> {
  const ok = await hasEmailVerification(email)
  if (ok) {
    await useStorage('auth').removeItem(verifiedKey(email))
  }
  return ok
}
