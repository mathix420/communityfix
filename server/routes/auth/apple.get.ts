export default defineOAuthAppleEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        id: user.id || user.sub || user.email,
        email: user.email,
        name: user.name,
        provider: 'apple',
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
  onError(event, error) {
    console.error('Apple OAuth error:', error)
    return sendRedirect(event, '/login?error=apple')
  },
})
