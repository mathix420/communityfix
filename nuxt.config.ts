// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/content',
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/ui',
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

  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
  },

  eslint: {
    config: {
      stylistic: true,
    },
  },
})
