// Newsletter email templates, styled after the dashboard bento: rounded white
// cards on a soft gray page, light-gray corner index numbers ("01"), a blue
// letterspaced kicker over a big condensed greeting, pill chips, hairline row
// dividers, and a blue pill button — the brand's rounded-cards surface
// language (decorative *lines* stay sharp; cards stay rounded).
// Email constraints shape the build: tables, inline styles, no images, no
// motion. border-radius degrades to square corners in old Outlook, which is
// acceptable. Oswald is requested via Google Fonts for clients that honor it
// (Apple Mail); everywhere else the condensed fallback stack keeps the shape.
// Every dynamic string is escaped: titles, summaries, and meta lines carry
// user-authored content.
import type { NewsletterFrequency } from '../database/schema'
import type { DigestSection } from './newsletter-digest'
import { NEWSLETTER_BASE_URL } from './newsletter-digest'
import { escapeHtml } from './escape-html'

const BLUE = '#155dfc' // Tailwind v4 blue-600 — the site's primary accent
// The site's prose links underline with `decoration-primary/40`; email has no
// alpha-safe decoration color, so this is blue-600 at 40% flattened onto white.
const BLUE_SOFT = '#a1befe'
const INK = '#111113'
const BODY = '#52525b' // zinc-600 — summaries + intro
const MUTED = '#a1a1aa' // zinc-400 — meta lines, footer
const INDEX = '#b9b9c0' // card corner numbers, like the dashboard stat cards
const PAGE_BG = '#ededee' // soft gray page behind the cards
const CARD_BG = '#ffffff'
const DIVIDER = '#efeff1' // hairline between rows inside a card
const CHIP_BORDER = '#e4e4e7'
const RADIUS = '24px'

const FONT_BODY = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const FONT_DISPLAY = "'Oswald', 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif"

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

function folioDate(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

function chip(label: string, href?: string): string {
  const style = `display:inline-block;border:1px solid ${CHIP_BORDER};border-radius:999px;padding:7px 14px;font-family:${FONT_DISPLAY};font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${BODY};text-decoration:none;`
  return href
    ? `<a href="${escapeHtml(href)}" style="${style}">${escapeHtml(label)}</a>`
    : `<span style="${style}">${escapeHtml(label)}</span>`
}

/** 16px gap between cards. */
function gap(): string {
  return `<tr><td style="height:16px;font-size:0;line-height:0;">&nbsp;</td></tr>`
}

function itemHtml(
  item: { title: string; url: string; summary?: string; meta?: string },
  first: boolean,
): string {
  return `
          <tr><td style="padding:${first ? '2px' : '16px'} 0 16px;${first ? '' : `border-top:1px solid ${DIVIDER};`}">
            <a href="${escapeHtml(item.url)}" style="font-family:${FONT_BODY};font-size:16px;font-weight:700;line-height:1.4;color:${INK};text-decoration:underline;text-decoration-color:${BLUE_SOFT};text-decoration-thickness:2px;text-underline-offset:4px;">${escapeHtml(item.title)}</a>
            ${item.summary ? `<div style="font-family:${FONT_BODY};font-size:14px;line-height:1.6;color:${BODY};padding-top:5px;">${escapeHtml(item.summary)}</div>` : ''}
            ${item.meta ? `<div style="font-family:${FONT_DISPLAY};font-size:10px;font-weight:500;line-height:1.6;letter-spacing:0.14em;text-transform:uppercase;color:${MUTED};padding-top:7px;">${escapeHtml(item.meta)}</div>` : ''}
          </td></tr>`
}

function sectionCardHtml(section: DigestSection, index: number): string {
  const number = String(index + 1).padStart(2, '0')
  return `${index > 0 ? gap() : ''}
      <tr><td style="background:${CARD_BG};border-radius:${RADIUS};padding:26px 32px 14px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:0 0 16px;font-family:${FONT_DISPLAY};font-size:12px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:${INK};">
            <span style="color:${INDEX};">${number}</span>&nbsp;&nbsp;&nbsp;${escapeHtml(section.title)}
          </td></tr>
          ${section.items.map((item, i) => itemHtml(item, i === 0)).join('')}
          ${
            section.footerLink
              ? `<tr><td style="padding:8px 0 16px;border-top:1px solid ${DIVIDER};"><a href="${escapeHtml(section.footerLink.url)}" style="display:inline-block;background:${BLUE};border-radius:999px;padding:11px 22px;font-family:${FONT_DISPLAY};font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#ffffff;text-decoration:none;">${escapeHtml(section.footerLink.label)} &rarr;</a></td></tr>`
              : ''
          }
        </table>
      </td></tr>`
}

function sectionText(section: DigestSection, index: number): string {
  const number = String(index + 1).padStart(2, '0')
  const items = section.items
    .map((i) =>
      [`- ${i.title}`, i.summary ? `  ${i.summary}` : null, `  ${i.url}`]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n')
  const footer = section.footerLink
    ? `\n\n${section.footerLink.label}: ${section.footerLink.url}`
    : ''
  return `${number} / ${section.title.toUpperCase()}\n\n${items}${footer}`
}

export function renderNewsletterEmail(opts: {
  name: string | null
  frequency: NewsletterFrequency
  sections: DigestSection[]
  unsubscribeUrl: string
  /** Send date shown in the header chip. Defaults to now. */
  date?: Date
}): { subject: string; html: string; text: string } {
  const { name, frequency, sections, unsubscribeUrl } = opts
  const subject = `Your ${frequency} digest — CommunityFix`
  const settingsUrl = `${NEWSLETTER_BASE_URL}/settings`
  const heading = name ? `Hi ${name}` : 'Hello'
  const period = frequency === 'weekly' ? 'week' : 'month'
  const intro = `Here is what happened on the commons this ${period}.`
  const dateLabel = folioDate(opts.date ?? new Date())

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600&display=swap" rel="stylesheet">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(sections.map((s) => s.title).join(' · '))}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE_BG};">
    <tr><td align="center" style="padding:36px 16px 44px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;text-align:left;">

        <tr><td style="padding:0 8px 14px;font-family:${FONT_DISPLAY};font-size:11px;font-weight:600;letter-spacing:0.24em;text-transform:uppercase;color:${MUTED};">
          CommunityFix
        </td></tr>

        <tr><td style="background:${CARD_BG};border-radius:${RADIUS};padding:30px 32px 30px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="font-family:${FONT_DISPLAY};font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:${BLUE};">${frequency} digest</td></tr>
            <tr><td style="padding:10px 0 0;font-family:${FONT_DISPLAY};font-size:34px;font-weight:600;line-height:1.1;text-transform:uppercase;color:${INK};">${escapeHtml(heading)}</td></tr>
            <tr><td style="padding:12px 0 0;font-family:${FONT_BODY};font-size:15px;line-height:1.6;color:${BODY};">${escapeHtml(intro)}</td></tr>
            <tr><td style="padding:20px 0 0;">${chip(dateLabel)}&nbsp;&nbsp;${chip('communityfix.org', NEWSLETTER_BASE_URL)}</td></tr>
          </table>
        </td></tr>
        ${gap()}

        ${sections.map(sectionCardHtml).join('')}

        <tr><td style="padding:24px 8px 0;font-family:${FONT_BODY};font-size:12px;line-height:1.7;color:${MUTED};">
          You are receiving this because you subscribed to the ${frequency} CommunityFix newsletter.
        </td></tr>
        <tr><td style="padding:8px 8px 0;font-family:${FONT_DISPLAY};font-size:10px;font-weight:500;letter-spacing:0.18em;text-transform:uppercase;">
          <a href="${escapeHtml(settingsUrl)}" style="color:${MUTED};text-decoration:underline;text-underline-offset:3px;">Manage preferences</a>
          <span style="color:${MUTED};">&nbsp;&middot;&nbsp;</span>
          <a href="${escapeHtml(unsubscribeUrl)}" style="color:${MUTED};text-decoration:underline;text-underline-offset:3px;">Unsubscribe</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  const text = [
    'COMMUNITYFIX',
    `${frequency} digest · ${dateLabel} · communityfix.org`,
    '',
    `${heading}. ${intro}`,
    '',
    sections.map(sectionText).join('\n\n'),
    '',
    `You are receiving this because you subscribed to the ${frequency} CommunityFix newsletter.`,
    `Manage preferences: ${settingsUrl}`,
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join('\n')

  return { subject, html, text }
}
