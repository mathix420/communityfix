import type { Nitro } from 'nitropack'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

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

  runtimeConfig: {
    openaiApiKey: '',
    databaseUrl: '',
  },

  routeRules: {
    '/umami/**': { proxy: 'https://cloud.umami.is/**' },
  },

  future: {
    compatibilityVersion: 4,
  },
  compatibilityDate: '2025-12-22',

  nitro: {
    // Pin the preset explicitly so the build always emits a Worker bundle.
    // Without this, Nitro can fall back to `node-server` if Workers Builds
    // doesn't inject NITRO_PRESET, producing an output that wrangler can't
    // deploy.
    preset: 'cloudflare_module',
    experimental: {
      asyncContext: true,
      tasks: true,
    },
    scheduledTasks: {
      // Recompute all trust scores daily at 3am UTC
      '0 3 * * *': ['compute:trust-scores'],
    },
    // Mount the `auth` namespace on the Cloudflare KV binding so the WebAuthn
    // challenge round-trip survives across requests / isolates. The default
    // unstorage memory driver is per-isolate and breaks the two-step register
    // and authenticate flows on stateless Workers.
    storage: {
      auth: {
        driver: 'cloudflare-kv-binding',
        binding: 'KV_AUTH',
      },
    },
    // In dev (`bun run dev`) there is no KV binding, so fall back to memory.
    // Single-process dev means the in-memory challenge survives the two-step
    // round-trip just fine.
    devStorage: {
      auth: {
        driver: 'memory',
      },
    },
    cloudflare: {
      // Let Nitro generate `.output/server/wrangler.json` and pick the right
      // Hyperdrive + KV bindings based on the build-time branch. CF Workers
      // Builds injects WORKERS_CI_BRANCH on every build; locally / on master
      // we default to the production bindings.
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
        kv_namespaces: [
          {
            binding: 'KV_AUTH',
            id: process.env.WORKERS_CI_BRANCH && process.env.WORKERS_CI_BRANCH !== 'master'
              ? 'b0d3e44f92ae4be0a0c57903404f62fb' // communityfix-auth-staging
              : '10ae9211092f42d4a90cd17a938c360a', // communityfix-auth (prod)
          },
        ],
      },
    },
  },
  hooks: {
    'nitro:build:before': (nitro: Nitro) => {
      nitro.options.moduleSideEffects.push('reflect-metadata')
    },
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
