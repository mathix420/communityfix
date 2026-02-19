declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    name: string | null
    provider: 'google' | 'apple' | 'passkey' | null
  }

  interface UserSession {
    loggedInAt?: number
  }
}

export {}
