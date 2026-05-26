import { defineContentConfig, defineCollection } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: 'page',
      source: '**/*.md',
    }),
    guides: defineCollection({
      type: 'page',
      source: 'guide/**/*.md',
    }),
  },
})
