import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'drizzle-kit'

function getLocalD1DB(): string {
  const d1Dir = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject'
  const files = fs.readdirSync(d1Dir).filter(f => f.endsWith('.sqlite'))
  if (!files.length) throw new Error(`No local D1 database found in ${d1Dir}. Run the dev server first.`)
  return path.join(d1Dir, files[0])
}

export default defineConfig({
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dialect: 'sqlite',
  ...(process.env.CLOUDFLARE_D1_DATABASE_ID
    ? {
        driver: 'd1-http',
        dbCredentials: {
          accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
          databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID!,
          token: process.env.CLOUDFLARE_API_TOKEN!,
        },
      }
    : {
        dbCredentials: {
          url: getLocalD1DB(),
        },
      }),
})
