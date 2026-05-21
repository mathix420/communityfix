// AuthForm calls this on mount when ?redirect= is present so the redirect
// target survives full-page OAuth round-trips.
export default defineEventHandler(async (event) => {
  const body = await readBody<{ url?: unknown }>(event)
  if (isSafePostLoginRedirect(body?.url)) {
    setPostLoginRedirect(event, body.url)
  }
  return { ok: true }
})
