export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user }) {
    try {
      if (!user.email) throw createError({ statusCode: 400, message: 'Email is required' })
      const { user: dbUser } = await handleOAuthLogin(event, user.email, user.name, 'google')
      // Explicit redirect targets (auth gates, MCP OAuth resume) always win;
      // otherwise users who haven't been through onboarding land there.
      const target = consumePostLoginRedirect(event)
      return sendRedirect(event, target ?? (dbUser.onboardedAt ? '/' : '/onboarding'))
    } catch (err) {
      console.error('Google OAuth onSuccess error:', err)
      return sendRedirect(event, '/login?error=google')
    }
  },
  onError(event, error) {
    console.error('Google OAuth error:', error)
    return sendRedirect(event, '/login?error=google')
  },
})
