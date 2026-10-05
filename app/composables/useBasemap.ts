import type * as Leaflet from 'leaflet'

// CARTO Voyager raster basemap shared by every Leaflet map (ExploreMap,
// LocationMap, LocationPicker). CARTO requires an API key on every tile URL
// (NUXT_PUBLIC_CARTO_API_KEY in Doppler, referer-restricted to our domains);
// without a valid one, tiles render an "API key required" watermark. Their
// terms also require the OpenStreetMap + CARTO attribution to stay visible.
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>'

export function useBasemap() {
  const { cartoApiKey } = useRuntimeConfig().public
  const url = `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoApiKey)}`

  // Call before adding other bottomright controls so the attribution sits in
  // the corner and the zoom control stacks above it.
  return (L: typeof Leaflet, map: Leaflet.Map) => {
    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map)
    L.tileLayer(url, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map)
  }
}
