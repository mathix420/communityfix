import type { GeoJsonGeometry } from '../../../server/database/schema'
import type { AgentTool } from './steps'

export interface GeoCandidate {
  placeId: number
  displayName: string
  type?: string
  category?: string
  lat: number
  lon: number
  // [south, north, west, east]
  boundingbox?: [number, number, number, number]
  geojson?: GeoJsonGeometry
}

export interface GeocodeTool extends AgentTool {
  byPlaceId: Map<number, GeoCandidate>
}

export function createGeocodeTool(userAgent: string): GeocodeTool {
  const byPlaceId = new Map<number, GeoCandidate>()
  return {
    byPlaceId,
    definition: {
      name: 'geocode',
      description: 'Search OpenStreetMap (Nominatim) for places matching a free-text query. Returns up to 5 candidates, each with a place_id, display_name, type, and centroid lat/lon. Call this multiple times with different phrasings (add the country, use the region/biome/landmark name, drop qualifiers) to surface the candidate whose real-world area best matches the document. Then submit the place_id of that candidate.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Place to search for, e.g. "Amazon rainforest, Brazil" or "Kibera, Nairobi".' },
        },
        required: ['query'],
      },
    },
    async run(input: { query: string }) {
      const candidates = await nominatimSearch(input.query, userAgent)
      for (const c of candidates) byPlaceId.set(c.placeId, c)
      return {
        results: candidates.map(c => ({
          place_id: c.placeId,
          display_name: c.displayName,
          type: c.type,
          category: c.category,
          lat: c.lat,
          lon: c.lon,
        })),
      }
    },
  }
}

interface NominatimRow {
  place_id: number
  display_name: string
  type?: string
  category?: string
  class?: string
  lat: string
  lon: string
  boundingbox?: [string, string, string, string]
  geojson?: GeoJsonGeometry
}

async function nominatimSearch(query: string, userAgent: string): Promise<GeoCandidate[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '5')
  url.searchParams.set('polygon_geojson', '1')
  url.searchParams.set('polygon_threshold', '0.005')
  url.searchParams.set('accept-language', 'en')

  const res = await fetch(url, { headers: { 'User-Agent': userAgent, Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Nominatim search failed (${res.status})`)
  const rows = await res.json() as NominatimRow[]

  return rows.map(r => ({
    placeId: r.place_id,
    displayName: r.display_name,
    type: r.type,
    category: r.category ?? r.class,
    lat: Number.parseFloat(r.lat),
    lon: Number.parseFloat(r.lon),
    boundingbox: r.boundingbox
      ? [Number.parseFloat(r.boundingbox[0]), Number.parseFloat(r.boundingbox[1]), Number.parseFloat(r.boundingbox[2]), Number.parseFloat(r.boundingbox[3])]
      : undefined,
    geojson: r.geojson,
  }))
}

// Convert a Nominatim [south, north, west, east] bbox into a GeoJSON Polygon,
// used as the area fallback when a candidate has no polygon geometry.
export function bboxToPolygon(bbox: [number, number, number, number]): GeoJsonGeometry {
  const [south, north, west, east] = bbox
  return {
    type: 'Polygon',
    coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
  }
}
