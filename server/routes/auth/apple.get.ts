export default defineOAuthAppleEventHandler({
  async onSuccess(event, { user }) {
    if (!user.email) throw createError({ statusCode: 400, message: 'Email is required' })
    const name = typeof user.name === 'string'
      ? user.name
      : [user.name?.firstName, user.name?.lastName].filter(Boolean).join(' ') || undefined
    const existing = await getUserByEmail(user.email)
    const dbUser = await ensureUser(user.email, name, 'apple')

    await setUserSession(event, {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        provider: 'apple',
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, existing ? '/' : '/settings')
  },
  onError(event, error) {
    console.error('Apple OAuth error:', error)
    return sendRedirect(event, '/login?error=apple')
  },
})
