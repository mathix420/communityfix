import type { AuthenticatorTransportFuture } from '@simplewebauthn/server'
import {
  getCredentialById,
  getUserByEmail,
  getUserById,
  listCredentialsByUserId,
  normalizeEmail,
  updateCredentialCounter,
} from '../../utils/auth-store'

export default defineWebAuthnAuthenticateEventHandler({
  async allowCredentials(event, userName) {
    if (!userName) { return [] }
    const email = normalizeEmail(userName)
    const user = await getUserByEmail(email)
    if (!user) {
      throw createError({ statusCode: 400, message: 'User not found' })
    }

    const credentials = await listCredentialsByUserId(user.id)
    if (!credentials.length) {
      throw createError({ statusCode: 400, message: 'No passkeys registered for this user' })
    }

    return credentials.map(c => ({
      id: c.id,
      transports: c.transports as AuthenticatorTransportFuture[],
    }))
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

  async getCredential(event, credentialId) {
    const credential = await getCredentialById(credentialId)
    if (!credential) {
      throw createError({ statusCode: 400, message: 'Credential not found' })
    }
    return credential
  },

  async onSuccess(event, { credential, authenticationInfo }) {
    const stored = await getCredentialById(credential.id)
    if (!stored) {
      throw createError({ statusCode: 400, message: 'Credential not registered' })
    }

    if (authenticationInfo?.newCounter != null) {
      await updateCredentialCounter(credential.id, authenticationInfo.newCounter)
    }

    const user = await getUserById(stored.userId)
    if (!user) {
      throw createError({ statusCode: 400, message: 'User not found for credential' })
    }

    await setUserSession(event, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: 'passkey',
      },
      loggedInAt: Date.now(),
    })
  },

  onError(event, error) {
    console.error('Passkey authenticate error:', error)
    throw error
  },
})
