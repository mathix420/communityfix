import { defineConfig } from 'vitest/config'

export default defineConfig({
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
