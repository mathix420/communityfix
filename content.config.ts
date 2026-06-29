import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: 'page',
      source: '**/*.md',
    }),
    guides: defineCollection({
      type: 'page',
      source: 'guide/**/*.md',
      // `rawbody` makes Nuxt Content keep the original markdown alongside the
      // parsed AST, so the MCP `get_guide` tool can hand the model real
      // markdown instead of the render tree.
      schema: z.object({
        rawbody: z.string(),
      }),
    }),
  },
})
