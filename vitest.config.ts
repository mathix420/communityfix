import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

// Load workers/moderation/src/steps/*.yaml as raw-string default exports so the
// step registry imports resolve under vitest, matching the Wrangler `Text`
// module rule used in the deployed Worker (see workers/moderation/wrangler.jsonc).
const moderationYamlAsText = {
  name: 'moderation-yaml-as-text',
  enforce: 'pre' as const,
  load(id: string) {
    const path = id.split('?')[0]
    if (path.includes('/workers/moderation/') && (path.endsWith('.yaml') || path.endsWith('.yml'))) {
      return `export default ${JSON.stringify(readFileSync(path, 'utf-8'))}`
    }
  },
}

export default defineConfig({
  plugins: [moderationYamlAsText],
  test: {
    testTimeout: 15000,
    hookTimeout: 60000,
    include: ['tests/**/*.test.ts'],
    // Migrate + reseed the local test DB once before the suite runs, so
    // integration tests have a known canonical dataset to assert against.
    // Pure unit tests (tests/unit/**) don't need this but it's harmless.
    globalSetup: ['./tests/global-setup.ts'],
  },
})
