import type { Nitro } from 'nitropack'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  hooks: {
    'nitro:build:before': (nitro: Nitro) => {
      nitro.options.moduleSideEffects.push('reflect-metadata')
    },
  },

  modules: [
    '@nuxt/content',
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/ui',
    '@nuxt/scripts',
    'nuxt-og-image',
    'nuxt-auth-utils',
  ],
  devtools: { enabled: true },

  app: {
    head: {
      htmlAttrs: {
        lang: 'en',
      },
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon-96x96.png', sizes: '96x96' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'shortcut icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
    },
  },

  css: [
    '@/assets/css/main.css',
  ],

  ui: {
    colorMode: false,
  },

  routeRules: {
    '/umami/**': { proxy: 'https://cloud.umami.is/**' },
  },

  future: {
    compatibilityVersion: 4,
  },
  compatibilityDate: '2025-12-22',

  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
    experimental: {
      asyncContext: true,
      wasm: true,
      tasks: true,
    },
    scheduledTasks: {
      '*/5 * * * *': ['review:pending'],
    },
  },

  runtimeConfig: {
    openaiApiKey: '',
  },

  auth: {
    webAuthn: true,
  },

  eslint: {
    config: {
      stylistic: true,
    },
  },

  fonts: {
    families: [
      { name: 'Inter', weights: [400] },
      { name: 'Oswald', weights: [400, 500] },
    ],
  },
})
