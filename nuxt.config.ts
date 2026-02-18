import type { Nitro } from 'nitropack'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  hooks: {
    'nitro:build:before': (nitro: Nitro) => {
      nitro.options.moduleSideEffects.push('reflect-metadata')
    },
  },

  modules: [
    '@nuxthub/core',
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
      wasm: true,
    },
  },

  hub: {
    database: true,
  },

  auth: {
    webAuthn: true,
  },

  eslint: {
    config: {
      stylistic: true,
    },
  },

  ogImage: {
    fonts: [
      'Inter:400',
      'Oswald:400',
      'Oswald:500',
    ],
  },
})
