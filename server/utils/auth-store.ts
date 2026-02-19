import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { users, credentials } from '../database/schema'
import type { Provider } from '../database/schema'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(input: string) {
  const email = input?.toString().trim().toLowerCase()
  if (!email || !EMAIL_REGEX.test(email)) {
    throw createError({ statusCode: 400, message: 'A valid email is required' })
  }
  return email
}

export async function getUserByEmail(email: string) {
  const db = useDB()
  const normalized = normalizeEmail(email)
  return await db.query.users.findFirst({
    where: eq(users.email, normalized),
  }) ?? null
}

export async function getUserById(id: string) {
  const db = useDB()
  return await db.query.users.findFirst({
    where: eq(users.id, id),
  }) ?? null
}

export async function ensureUser(email: string, name?: string, provider?: Provider) {
  const db = useDB()
  const normalized = normalizeEmail(email)
  const existing = await db.query.users.findFirst({
    where: eq(users.email, normalized),
  })
  if (existing) return existing

  const [user] = await db.insert(users).values({
    email: normalized,
    name: name ?? null,
    provider: provider ?? null,
  }).returning()
  return user!
}

export async function listCredentialsByUserId(userId: string) {
  const db = useDB()
  return await db.query.credentials.findMany({
    where: eq(credentials.userId, userId),
  })
}

export async function getCredentialById(id: string) {
  const db = useDB()
  return await db.query.credentials.findFirst({
    where: eq(credentials.id, id),
  }) ?? null
}

export async function upsertCredential(credential: {
  id: string
  userId: string
  publicKey: string
  counter: number
  backedUp: boolean
  transports: string[]
}) {
  const db = useDB()
  await db.insert(credentials).values({
    id: credential.id,
    userId: credential.userId,
    publicKey: credential.publicKey,
    counter: credential.counter,
    backedUp: credential.backedUp,
    transports: credential.transports,
  }).onConflictDoUpdate({
    target: credentials.id,
    set: {
      publicKey: credential.publicKey,
      counter: credential.counter,
      backedUp: credential.backedUp,
      transports: credential.transports,
    },
  })
}

export async function updateCredentialCounter(id: string, counter: number) {
  const db = useDB()
  await db.update(credentials)
    .set({ counter })
    .where(eq(credentials.id, id))
}

export async function handleOAuthLogin(event: H3Event, email: string, name: string | undefined, provider: Provider) {
  const existing = await getUserByEmail(email)
  const dbUser = await ensureUser(email, name, provider)

  await setUserSession(event, {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      provider,
    },
    loggedInAt: Date.now(),
  })

  return { isNew: !existing }
}
