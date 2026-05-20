// Admin-by-email allowlist sourced from `runtimeConfig.adminEmails`
// (NUXT_ADMIN_EMAILS in Doppler). Kept off the users table so granting admin
// doesn't require a migration and can be flipped per-environment.
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const raw = useRuntimeConfig().adminEmails || ''
  const allowed = raw
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(email.toLowerCase())
}
