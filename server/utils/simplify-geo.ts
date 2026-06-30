import type { GeoJsonGeometry, LocationScale } from '../database/schema'

// Nominatim/OSM admin boundaries (a country, state, or biome) can carry several
// thousand vertices. We only ever use `area` to shade a region on a map, where
// metre-level precision is worthless — but stored verbatim a single polygon can
// reach 150 KB, which overflows the MCP token cap and makes the record
// unretrievable. Simplify the geometry before it is persisted (and backfill the
// rows that predate this). Pure planar geometry, no dependencies — safe to bundle
// into the moderation Worker and to run from a standalone backfill script.

// Coordinate precision to keep, in decimal places. 5 dp ≈ 1.1 m — far finer than
// any simplification tolerance below, and on its own cuts payload ~2-3x.
const COORD_DP = 5

// Simplification tolerance in degrees, by location scale. Smaller scales keep
// crisp outlines; a country or biome is flattened hard since its on-map area
// dwarfs the error. ~0.001° ≈ 110 m at the equator. Tolerance is capped at
// 2.2 km (national) — coarser than that gives no further payload win worth the
// extra distortion, so global reuses the national bound.
const TOLERANCE_BY_SCALE: Record<LocationScale, number> = {
  neighborhood: 0.0003, // ~33 m
  city: 0.001, //         ~110 m
  region: 0.005, //       ~550 m
  national: 0.02, //      ~2.2 km
  global: 0.02, //        ~2.2 km (capped)
}
const DEFAULT_TOLERANCE = 0.01 // unknown scale → ~1.1 km

export function areaSimplifyTolerance(scale: LocationScale | null | undefined): number {
  return (scale && TOLERANCE_BY_SCALE[scale]) || DEFAULT_TOLERANCE
}

function round(n: number): number {
  const f = 10 ** COORD_DP
  return Math.round(n * f) / f
}

// Perpendicular distance from point p to the segment a→b (planar, in degrees).
function perpendicularDistance(p: number[], a: number[], b: number[]): number {
  const dx = b[0]! - a[0]!
  const dy = b[1]! - a[1]!
  if (dx === 0 && dy === 0) return Math.hypot(p[0]! - a[0]!, p[1]! - a[1]!)
  const t = ((p[0]! - a[0]!) * dx + (p[1]! - a[1]!) * dy) / (dx * dx + dy * dy)
  const cx = a[0]! + t * dx
  const cy = a[1]! + t * dy
  return Math.hypot(p[0]! - cx, p[1]! - cy)
}

// Iterative Douglas–Peucker (iterative to avoid stack blow-up on multi-thousand
// point rings). Always keeps the first and last point, so ring closure survives.
function douglasPeucker(points: number[][], tolerance: number): number[][] {
  const n = points.length
  if (n <= 2) return points
  const keep = new Uint8Array(n)
  keep[0] = 1
  keep[n - 1] = 1
  const stack: Array<[number, number]> = [[0, n - 1]]
  while (stack.length > 0) {
    const [first, last] = stack.pop()!
    let maxDist = 0
    let index = -1
    for (let i = first + 1; i < last; i++) {
      const d = perpendicularDistance(points[i]!, points[first]!, points[last]!)
      if (d > maxDist) {
        maxDist = d
        index = i
      }
    }
    if (maxDist > tolerance && index !== -1) {
      keep[index] = 1
      stack.push([first, index], [index, last])
    }
  }
  const out: number[][] = []
  for (let i = 0; i < n; i++) if (keep[i]) out.push(points[i]!)
  return out
}

// Simplify one linear ring, then round its coordinates. Falls back to the
// original ring if simplification would make it degenerate (a valid ring needs
// ≥4 positions, the last repeating the first).
function simplifyRing(ring: number[][], tolerance: number): number[][] {
  const simplified = ring.length >= 4 ? douglasPeucker(ring, tolerance) : ring
  const used = simplified.length >= 4 ? simplified : ring
  return used.map((c) => [round(c[0]!), round(c[1]!), ...c.slice(2)])
}

function simplifyPolygon(rings: number[][][], tolerance: number): number[][][] {
  return rings.map((r) => simplifyRing(r, tolerance))
}

/**
 * Simplify a GeoJSON `area` geometry in place of storing the raw geocoder output.
 * Handles Polygon and MultiPolygon (the only types geocoding produces for an
 * area); anything else is returned unchanged.
 */
export function simplifyAreaGeometry(geom: GeoJsonGeometry, tolerance: number): GeoJsonGeometry {
  if (geom.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: simplifyPolygon(geom.coordinates as number[][][], tolerance),
    }
  }
  if (geom.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: (geom.coordinates as number[][][][]).map((poly) =>
        simplifyPolygon(poly, tolerance),
      ),
    }
  }
  return geom
}
