// One-click unsubscribe target for newsletter emails. Must work logged-out:
// the HMAC-signed token in the link (see newsletter-token.ts) is the proof
// of account ownership. Idempotent — a second click lands on the same
// confirmation. Renders a tiny branded HTML page rather than JSON because
// the visitor arrives from an email client.
import { eq, sql } from 'drizzle-orm'
import { newsletterPrefs } from '../../database/schema'
import { verifyUnsubscribeToken } from '../../utils/newsletter-token'

function page(title: string, body: string, status = 200) {
  return {
    status,
    html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — CommunityFix</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: -apple-system, system-ui, sans-serif; background: #f7f7f8; margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 1.5rem; }
    .card { background: white; border-radius: 14px; padding: 2rem; max-width: 28rem; width: 100%; box-shadow: 0 8px 32px rgba(0,0,0,0.06); border: 1px solid #ececef; }
    .wordmark { display: inline-block; font-weight: 700; font-size: .8rem; letter-spacing: .08em; text-transform: uppercase; color: #000; border-bottom: 3px solid #155dfc; padding-bottom: 2px; margin-bottom: 1.25rem; }
    h1 { margin: 0 0 .5rem; font-size: 1.25rem; }
    p { color: #555; line-height: 1.5; }
    a { color: #155dfc; }
  </style>
</head>
<body>
  <div class="card">
    <span class="wordmark">CommunityFix</span>
    <h1>${title}</h1>
    ${body}
  </div>
</body>
</html>`,
  }
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const token = typeof q.token === 'string' ? q.token : ''

  setHeader(event, 'content-type', 'text/html; charset=utf-8')
  setHeader(event, 'cache-control', 'no-store')

  const userId = token ? await verifyUnsubscribeToken(token) : null
  if (!userId) {
    const { status, html } = page(
      'This unsubscribe link is not valid',
      `<p>The link may have been truncated by your email client. You can also turn the newsletter off from your <a href="/settings">account settings</a>.</p>`,
      400,
    )
    setResponseStatus(event, status)
    return html
  }

  await useDB()
    .update(newsletterPrefs)
    .set({ enabled: false, updatedAt: sql`now()` })
    .where(eq(newsletterPrefs.userId, userId))

  return page(
    "You're unsubscribed",
    `<p>You won't receive the newsletter anymore. Changed your mind? Re-enable it anytime in your <a href="/settings">account settings</a>.</p>`,
  ).html
})
