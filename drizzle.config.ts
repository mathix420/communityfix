import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dialect: 'postgresql',
  extensionsFilters: ['postgis'],
  tablesFilter: ['!spatial_ref_sys'],
  dbCredentials: {
    url: process.env.NUXT_DATABASE_URL || 'postgres://communityfix:communityfix@localhost:5432/communityfix',
  },
})
