type StoredUser = {
  id: string
  email: string
}

type StoredCredential = {
  id: string
  userId: string
  publicKey: string
  counter: number
  backedUp: boolean
  transports: string[]
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function authStorage() {
  return useStorage('auth')
}

export function normalizeEmail(input: string) {
  const email = input?.toString().trim().toLowerCase()
  if (!email || !EMAIL_REGEX.test(email)) {
    throw createError({ statusCode: 400, message: 'A valid email is required' })
  }
  return email
}

async function getUsers(): Promise<StoredUser[]> {
  return await authStorage().getItem<StoredUser[]>('users') ?? []
}

async function saveUsers(users: StoredUser[]) {
  await authStorage().setItem('users', users)
}

async function getCredentials(): Promise<StoredCredential[]> {
  return await authStorage().getItem<StoredCredential[]>('credentials') ?? []
}

async function saveCredentials(credentials: StoredCredential[]) {
  await authStorage().setItem('credentials', credentials)
}

export async function getUserByEmail(email: string) {
  const normalized = normalizeEmail(email)
  const users = await getUsers()
  return users.find(user => user.email === normalized) ?? null
}

export async function getUserById(id: string) {
  const users = await getUsers()
  return users.find(user => user.id === id) ?? null
}

export async function ensureUser(email: string) {
  const normalized = normalizeEmail(email)
  const users = await getUsers()
  const existing = users.find(user => user.email === normalized)
  if (existing) { return existing }

  const user = { id: crypto.randomUUID(), email: normalized }
  users.push(user)
  await saveUsers(users)
  return user
}

export async function listCredentialsByUserId(userId: string) {
  const credentials = await getCredentials()
  return credentials.filter(c => c.userId === userId)
}

export async function getCredentialById(id: string) {
  const credentials = await getCredentials()
  return credentials.find(c => c.id === id) ?? null
}

export async function upsertCredential(credential: StoredCredential) {
  const credentials = await getCredentials()
  const index = credentials.findIndex(c => c.id === credential.id)
  if (index !== -1) {
    credentials[index] = { ...credentials[index], ...credential }
  }
  else {
    credentials.push(credential)
  }
  await saveCredentials(credentials)
}

export async function updateCredentialCounter(id: string, counter: number) {
  const credentials = await getCredentials()
  const index = credentials.findIndex(c => c.id === id)
  if (index === -1) { return }
  credentials[index].counter = counter
  await saveCredentials(credentials)
}
