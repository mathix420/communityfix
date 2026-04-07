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
    experimental: {
      asyncContext: true,
      tasks: true,
    },
    scheduledTasks: {
      // Recompute all trust scores daily at 3am UTC
      '0 3 * * *': ['compute:trust-scores'],
    },
    cloudflare: {
      // Let Nitro generate `.output/server/wrangler.json` and pick the right
      // Hyperdrive binding based on the build-time branch. CF Workers Builds
      // injects WORKERS_CI_BRANCH on every build; locally / on master we
      // default to the production Hyperdrive config.
      //
      // We can't use `wrangler.jsonc` `env.<name>` blocks here because Nitro's
      // cloudflare-module preset emits a "redirected" wrangler config and
      // wrangler 4.x rejects redirected configs that contain env blocks.
      deployConfig: true,
      wrangler: {
        hyperdrive: [
          {
            binding: 'HYPERDRIVE',
            id: process.env.WORKERS_CI_BRANCH && process.env.WORKERS_CI_BRANCH !== 'master'
              ? 'd9a5e6878b9342b4ac96844524a59d05' // communityfix-staging → Neon staging branch
              : '9cfe49d0e805462086e8365bd604a062', // communityfix-prod → Neon production branch
          },
        ],
      },
    },
  },

  runtimeConfig: {
    openaiApiKey: '',
    databaseUrl: '',
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
