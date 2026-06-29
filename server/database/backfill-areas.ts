import postgres from 'postgres'
import { areaSimplifyTolerance, simplifyAreaGeometry } from '../utils/simplify-geo'
import type { GeoJsonGeometry, LocationScale } from './schema'

// One-off backfill: re-simplify every stored `area` polygon that predates the
// simplify-on-write change in the moderation Worker. Raw geocoder boundaries can
// reach ~150 KB and overflow the MCP token cap, making the record unretrievable.
// Reads NUXT_DATABASE_URL (use the *direct* Neon URL for prod). Idempotent — a
// row is only rewritten when simplification actually shrinks it, so re-running is
// a no-op. Run with: `doppler run -c prd -- bun run server/database/backfill-areas.ts`

const url = process.env.NUXT_DATABASE_URL || 'postgres://communityfix:communityfix@localhost:5432/communityfix'
const client = postgres(url, { max: 1 })
const DRY = process.env.DRY === '1' || process.argv.includes('--dry')

const TABLES = ['issues', 'case_studies'] as const

interface AreaRow { id: number, scale: LocationScale | null, area: GeoJsonGeometry }

try {
  let updated = 0
  let bytesBefore = 0
  let bytesAfter = 0

  for (const table of TABLES) {
    const rows = await client<AreaRow[]>`
      SELECT id, scale, area FROM ${client(table)} WHERE area IS NOT NULL
    `
    console.log(`\n${table}: ${rows.length} rows with an area`)
    for (const row of rows) {
      const before = JSON.stringify(row.area).length
      const simplified = simplifyAreaGeometry(row.area, areaSimplifyTolerance(row.scale))
      const after = JSON.stringify(simplified).length
      if (after >= before) continue // already minimal — leave it
      if (!DRY) {
        await client`
          UPDATE ${client(table)} SET area = ${client.json(simplified)}::jsonb WHERE id = ${row.id}
        `
      }
      updated++
      bytesBefore += before
      bytesAfter += after
      console.log(`  ${table}#${row.id} [${row.scale ?? '—'}] ${before} → ${after} bytes`)
    }
  }

  const pct = bytesBefore > 0 ? Math.round((1 - bytesAfter / bytesBefore) * 100) : 0
  console.log(`\n${DRY ? '[DRY] would rewrite' : 'Done. Rewrote'} ${updated} rows; ${bytesBefore} → ${bytesAfter} bytes (-${pct}%).`)
}
finally {
  await client.end()
}
