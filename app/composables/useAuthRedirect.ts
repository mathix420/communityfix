// Helper for "click an action that needs auth → bounce to /login with a
// redirect back to the current page". Used by vote/endorse-style handlers
// where the user clicked a button that hits an authed API.
export function useAuthRedirect() {
  const { loggedIn } = useUserSession()
  const route = useRoute()
  const { track } = useUmami()

  // Returns true if the caller may proceed (user is logged in). If logged out,
  // fires an analytics event and navigates to /login?redirect=<current path>,
  // and returns false so the caller bails out.
  function requireAuth(action: string): boolean {
    if (loggedIn.value) return true
    track('Auth gate triggered', { action })
    navigateTo({ path: '/login', query: { redirect: route.fullPath } })
    return false
  }

  return { requireAuth }
}
