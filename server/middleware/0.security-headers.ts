// Baseline security headers on every response. No CSP (too risky to add blindly).
export default defineEventHandler((event) => {
  setHeader(event, 'Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin')
  setHeader(event, 'X-Frame-Options', 'SAMEORIGIN')
  setHeader(event, 'Permissions-Policy', 'camera=(), microphone=(), interest-cohort=()')
})
