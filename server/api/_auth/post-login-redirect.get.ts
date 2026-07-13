// Called by AuthForm after a passkey login/registration. Returns the safe
// same-origin path stored in the redirect cookie; when there is none, sends
// users who haven't been through onboarding to /onboarding (the explicit
// redirect always wins so auth gates and the MCP OAuth resume keep working).
import { eq } from 'drizzle-orm'
import { users } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const url = consumePostLoginRedirect(event)
  if (url) return { url }

  const session = await getUserSession(event)
  if (session.user?.id) {
    const row = await useDB().query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { onboardedAt: true },
    })
    if (row && !row.onboardedAt) return { url: '/onboarding' }
  }

  return { url: '' }
})
