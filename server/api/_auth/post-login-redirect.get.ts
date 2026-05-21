// Called by AuthForm after a passkey login. Returns the safe same-origin path
// stored in the redirect cookie (or '' if none / unsafe).
export default defineEventHandler((event) => {
  return { url: consumePostLoginRedirect(event) ?? '' }
})
