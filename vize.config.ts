import { defineConfig } from 'vize'

// Vize — Rust-native Vue toolchain (fmt + lint + check) with first-class
// Vue SFC support, replacing the ox stack.
// Formatter is tuned to the existing Nuxt/ESLint style so adopting it is
// low-churn: no semicolons, single quotes, 2-space indent, trailing commas.
export default defineConfig({
  linter: {
    preset: 'nuxt',
  },
  formatter: {
    semi: false,
    singleQuote: true,
    tabWidth: 2,
    trailingComma: 'all',
  },
  ignores: ['.nuxt', '.nitro', '.output', '.data', '.wrangler', 'dist', 'node_modules'],
})
