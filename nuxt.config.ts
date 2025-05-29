// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxthub/core',
    '@nuxt/content',
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/ui',
    '@nuxt/scripts',
  ],
  devtools: { enabled: true },

  css: [
    '@/assets/css/main.css',
  ],

  ui: {
    colorMode: false,
  },

  future: {
    compatibilityVersion: 4,
  },
  compatibilityDate: '2025-05-15',

  hub: {
    database: true,
  },

  eslint: {
    config: {
      stylistic: true,
    },
  },
})