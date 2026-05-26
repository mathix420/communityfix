// Centralized helper for admin action buttons.
//
// Two things it solves:
//   1. Idempotency — a Set of in-flight keys disables the matching button
//      synchronously, so a double-click can't fire two POSTs while the first
//      is still in transit (which `actionLoading.value = key` used to allow
//      because watchEffect resolution is async).
//   2. Consistent error capture — surfaces server messages instead of letting
//      the promise reject silently.
export function useAdminAction() {
  const pending = reactive<Set<string>>(new Set())
  const lastError = ref<string | null>(null)

  function isPending(key: string) {
    return pending.has(key)
  }

  async function run<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
    if (pending.has(key)) return null
    pending.add(key)
    lastError.value = null
    try {
      return await fn()
    }
    catch (err: unknown) {
      const msg = (err as { data?: { message?: string }, message?: string })?.data?.message
        ?? (err as { message?: string })?.message
        ?? 'Action failed'
      lastError.value = msg
      console.error('[admin-action]', key, err)
      return null
    }
    finally {
      pending.delete(key)
    }
  }

  return { run, isPending, lastError }
}
