import {
  ensureUser,
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
    // Log the original error here so we can see it in Better Stack instead
    // of staring at the sanitized wrapper.
    const email = normalizeEmail(user.userName)
    try {
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
