import { defineConfig } from 'vize'

// Vize — Rust-native Vue toolchain (fmt + lint + check) with first-class
// Vue SFC support, replacing the ox stack.
// Formatter is tuned to the existing Nuxt/ESLint style so adopting it is
// low-churn: no semicolons, single quotes, 2-space indent, trailing commas.
export default defineConfig({
  linter: {
    preset: 'nuxt',
    rules: {
      // Nuxt auto-imports components with directory-prefixed names
      // (AppFooter, UiBadge, …), so single-word filenames don't clash
      // with HTML elements — this rule is just noise here.
      'vue/multi-word-component-names': 'off',
    },
  },
  formatter: {
    semi: false,
    singleQuote: true,
    tabWidth: 2,
    trailingComma: 'all',
  },
  ignores: ['.nuxt', '.nitro', '.output', '.data', '.wrangler', 'dist', 'node_modules'],
})
