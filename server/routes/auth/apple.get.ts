export default defineOAuthAppleEventHandler({
  async onSuccess(event, { user }) {
    try {
      if (!user.email) throw createError({ statusCode: 400, message: 'Email is required' })
      const name = typeof user.name === 'string'
        ? user.name
        : [user.name?.firstName, user.name?.lastName].filter(Boolean).join(' ') || undefined
      const { isNew } = await handleOAuthLogin(event, user.email, name, 'apple')
      return sendRedirect(event, isNew ? '/settings' : '/')
    }
    catch (err) {
      console.error('Apple OAuth onSuccess error:', err)
      return sendRedirect(event, '/login?error=apple')
    }
  },
  onError(event, error) {
    console.error('Apple OAuth error:', error)
    return sendRedirect(event, '/login?error=apple')
  },
})
