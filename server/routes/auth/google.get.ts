export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user }) {
    if (!user.email) throw createError({ statusCode: 400, message: 'Email is required' })
    const existing = await getUserByEmail(user.email)
    const dbUser = await ensureUser(user.email, user.name, 'google')

    await setUserSession(event, {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        provider: 'google',
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, existing ? '/' : '/settings')
  },
  onError(event, error) {
    console.error('Google OAuth error:', error)
    return sendRedirect(event, '/login?error=google')
  },
})
