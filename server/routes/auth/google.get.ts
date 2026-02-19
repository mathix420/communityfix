export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user }) {
    try {
      if (!user.email) throw createError({ statusCode: 400, message: 'Email is required' })
      const { isNew } = await handleOAuthLogin(event, user.email, user.name, 'google')
      return sendRedirect(event, isNew ? '/settings' : '/')
    }
    catch (err) {
      console.error('Google OAuth onSuccess error:', err)
      return sendRedirect(event, '/login?error=google')
    }
  },
  onError(event, error) {
    console.error('Google OAuth error:', error)
    return sendRedirect(event, '/login?error=google')
  },
})
