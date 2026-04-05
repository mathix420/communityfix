const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

export async function apiFetch<T = any>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  const text = await res.text()
  let data: any
  try {
    data = JSON.parse(text)
  }
  catch {
    data = text
  }

  if (!res.ok) {
    const error: any = new Error(`HTTP ${res.status}`)
    error.statusCode = res.status
    error.data = data
    throw error
  }

  return data as T
}
