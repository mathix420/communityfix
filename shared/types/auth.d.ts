declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    name?: string | null
    provider?: string | null
  }
}

export {}
