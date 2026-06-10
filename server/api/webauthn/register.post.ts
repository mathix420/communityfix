import {
  ensureUser,
  getUserByEmail,
  normalizeEmail,
  upsertCredential,
} from '../../utils/auth-store'

export default defineWebAuthnRegisterEventHandler({
  getOptions() {
    return {
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
    }
  },

  async validateUser(userBody, event) {
    const email = normalizeEmail(userBody?.userName || '')

    const session = await getUserSession(event)
    if (session.user?.email && session.user.email !== email) {
      throw createError({ statusCode: 400, message: 'Email does not match the current session' })
    }

    // Block account takeover: if an account already exists for this email
    // (e.g. created via Google OAuth), only allow registering a passkey when
    // the caller is already signed in as that user. Passkey registration does
    // not verify email ownership on its own, so without this check anyone who
    // knows the email could attach a key to someone else's account.
    const existing = await getUserByEmail(email)
    if (existing && session.user?.id !== existing.id) {
      throw createError({
        statusCode: 409,
        message: 'An account already exists for this email. Sign in with your existing method first, then add a passkey from your settings.',
      })
    }

    // Require an email-PIN verification flag for first-time signups. A user
    // already signed in as the same account is exempt (legitimately adding a
    // second passkey from settings). We only check presence here; consumption
    // happens in onSuccess so a failed WebAuthn ceremony doesn't waste it.
    const isAddingToOwnAccount = existing && session.user?.id === existing.id
    if (!isAddingToOwnAccount && !await hasEmailVerification(email)) {
      throw createError({
        statusCode: 403,
        message: 'Verify your email with the code we sent before creating a passkey.',
      })
    }

    return { userName: email }
  },

  async storeChallenge(event, challenge, attemptId) {
    await useStorage('auth').setItem(`attempt:${attemptId}`, challenge)
  },

  async getChallenge(event, attemptId) {
    const key = `attempt:${attemptId}`
    const challenge = await useStorage('auth').getItem<string>(key)
    await useStorage('auth').removeItem(key)

    if (!challenge) {
      throw createError({ statusCode: 400, message: 'Challenge expired' })
    }

    return challenge
  },

  async onSuccess(event, { credential, user }) {
    // nuxt-auth-utils wraps any non-H3Error thrown from onSuccess into a
    // generic 500 "Failed to register credential" before our onError ever
    // sees it (see node_modules/nuxt-auth-utils/.../webauthn/register.js).
    const email = normalizeEmail(user.userName)
    try {
      // Burn the verification flag if there was one (new-account path).
      // No-op for the "logged-in user adds another passkey" path.
      await consumeEmailVerification(email)

      const dbUser = await ensureUser(email)

      await upsertCredential({
        id: credential.id,
        userId: dbUser.id,
        publicKey: credential.publicKey,
        counter: credential.counter,
        backedUp: credential.backedUp,
        transports: credential.transports || [],
      })

      await setUserSession(event, {
        user: {
          id: dbUser.id,
          email,
          name: dbUser.name,
          provider: 'passkey',
        },
        loggedInAt: Date.now(),
      })
    } catch (err) {
      console.error('[webauthn/register onSuccess] failed', {
        email,
        credentialId: credential.id,
        error: err instanceof Error
          ? { name: err.name, message: err.message, stack: err.stack }
          : err,
      })
      throw err
    }
  },

  onError(event, error) {
    console.error('Passkey register error:', error)
    throw error
  },
})
