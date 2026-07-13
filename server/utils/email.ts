import type { H3Event } from 'h3'
import { resolveEmailBinding } from './email-binding'

// Accepts "user@example.com" or "Display Name <user@example.com>".
function parseFromAddress(input: string): { email: string; name?: string } {
  const m = /^([^<]*)<([^>]+)>\s*$/.exec(input.trim())
  if (m) {
    const name = (m[1] ?? '').trim()
    return { email: (m[2] ?? '').trim(), name: name || undefined }
  }
  return { email: input.trim() }
}

// `event` is null when sending from a scheduled task (no request in flight);
// the EMAIL binding then comes from the `cloudflare:scheduled` stash instead
// of the request context — see server/utils/email-binding.ts.
export async function sendEmail(
  event: H3Event | null,
  opts: {
    to: string
    subject: string
    html: string
    text?: string
  },
): Promise<void> {
  const from = useRuntimeConfig().emailFrom
  if (!from) {
    throw createError({
      statusCode: 500,
      message: 'Email is not configured (missing NUXT_EMAIL_FROM).',
    })
  }

  const text = opts.text ?? opts.html.replace(/<[^>]+>/g, '')
  const binding = resolveEmailBinding(event)

  if (!binding) {
    // In `bun run dev` there's no Cloudflare runtime, so the binding is
    // undefined. Surface the email contents in the dev console so the flow
    // is testable without `wrangler dev --remote`.
    if (import.meta.dev) {
      console.info('[email:dev]', { to: opts.to, subject: opts.subject, text })
      return
    }
    throw createError({
      statusCode: 500,
      message:
        'EMAIL binding not available — Cloudflare Email Sending must be enabled and bound as EMAIL.',
    })
  }

  await binding.send({
    to: opts.to,
    from: parseFromAddress(from),
    subject: opts.subject,
    html: opts.html,
    text,
  })
}
