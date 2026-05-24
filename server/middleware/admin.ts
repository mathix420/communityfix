export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/admin')) return

  const session = await requireUserSession(event)
  if (!isAdminEmail(session.user.email)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }
})
