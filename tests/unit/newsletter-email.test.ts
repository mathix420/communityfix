import { describe, it, expect } from 'vitest'
import { renderNewsletterEmail } from '../../server/utils/newsletter-email'
import type { DigestSection } from '../../server/utils/newsletter-digest'

const sections: DigestSection[] = [
  {
    key: 'topicMatches',
    title: 'New in your interests',
    items: [
      {
        title: 'Urban heat islands',
        url: 'https://communityfix.org/issue/42',
        summary: 'Cities are getting hotter.',
        meta: 'matches “climate adaptation”',
      },
    ],
  },
  {
    key: 'helpWanted',
    title: 'Help wanted',
    items: [
      {
        title: 'Community composting',
        url: 'https://communityfix.org/issue/7',
        summary: 'Needs a cost baseline.',
      },
    ],
    footerLink: { label: 'See everything', url: 'https://communityfix.org/contribute' },
  },
]

const base = {
  name: 'Ada',
  frequency: 'weekly' as const,
  sections,
  unsubscribeUrl: 'https://communityfix.org/api/newsletter/unsubscribe?token=abc.def',
}

describe('renderNewsletterEmail', () => {
  it('renders every section with items, links, and the footer', () => {
    const { subject, html, text } = renderNewsletterEmail(base)

    expect(subject).toBe('Your weekly digest — CommunityFix')
    expect(html).toContain('Hi Ada')
    expect(html).toContain('New in your interests')
    expect(html).toContain('https://communityfix.org/issue/42')
    expect(html).toContain('Urban heat islands')
    expect(html).toContain('See everything')
    expect(html).toContain(base.unsubscribeUrl)
    expect(html).toContain('https://communityfix.org/settings')

    // Plaintext mirrors the content.
    expect(text).toContain('NEW IN YOUR INTERESTS')
    expect(text).toContain('- Urban heat islands')
    expect(text).toContain('https://communityfix.org/issue/7')
    expect(text).toContain(`Unsubscribe: ${base.unsubscribeUrl}`)
  })

  it('adapts subject and intro to the frequency and copes with a missing name', () => {
    const { subject, html } = renderNewsletterEmail({
      ...base,
      name: null,
      frequency: 'monthly',
    })
    expect(subject).toBe('Your monthly digest — CommunityFix')
    // No name on file → neutral greeting, and the intro reflects the period.
    expect(html).toContain('Hello')
    expect(html).toContain('Here is what happened on the commons this month.')
  })

  it('escapes user-authored content everywhere it lands in the HTML', () => {
    const { html } = renderNewsletterEmail({
      ...base,
      name: '<b>Ada</b>',
      sections: [
        {
          key: 'goodNews',
          title: 'Good news',
          items: [
            {
              title: '<script>alert(1)</script>',
              url: 'https://communityfix.org/case-study/1" onmouseover="x',
              summary: 'A & B <img src=x>',
              meta: 'Berlin · "quoted"',
            },
          ],
        },
      ],
    })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<b>Ada</b>')
    expect(html).toContain('A &amp; B &lt;img src=x&gt;')
    expect(html).toContain('&quot;quoted&quot;')
    // The href attribute can't be broken out of either.
    expect(html).toContain('case-study/1&quot; onmouseover=&quot;x')
  })
})
