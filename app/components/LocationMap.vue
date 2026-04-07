<script setup lang="ts">
const props = defineProps<{
  latitude: number
  longitude: number
  scale?: string | null
}>()

const mapEl = ref<HTMLElement>()
let map: any = null
let areaLayer: any = null
let areaCenter: [number, number] | null = null
let L: any = null

const areaStyle = {
  color: 'var(--color-primary-500, #2563eb)',
  weight: 2,
  opacity: 0.6,
  fillOpacity: 0.08,
  dashArray: '6 4',
}

function scaleToZoom(scale: string | null | undefined): number {
  switch (scale) {
    case 'neighborhood': return 14
    case 'city': return 11
    case 'region': return 7
    case 'national': return 4
    case 'global': return 2
    default: return 9
  }
}

async function initMap() {
  if (!mapEl.value || map) return

  await import('leaflet/dist/leaflet.css')
  const leaflet = await import('leaflet')
  L = leaflet.default || leaflet

  map = L.map(mapEl.value, {
    center: [props.latitude, props.longitude],
    zoom: scaleToZoom(props.scale),
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false,
  })

  L.control.zoom({ position: 'bottomright' }).addTo(map)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd',
  }).addTo(map)

  fetchArea()
}

async function fetchArea() {
  try {
    const data = await $fetch<{
      lat: string
      lon: string
      boundingbox?: [string, string, string, string]
      geojson?: GeoJSON.Geometry
    }>(
      'https://nominatim.openstreetmap.org/reverse',
      {
        query: {
          lat: String(props.latitude),
          lon: String(props.longitude),
          format: 'json',
          polygon_geojson: '1',
          polygon_threshold: '0.005',
          zoom: scaleToNominatimZoom(props.scale),
        },
        headers: { 'Accept-Language': 'en' },
      },
    )
    showArea(data)
  }
  catch {
    // Nominatim failed — map stays centered on the pin, no area drawn
  }
}

function scaleToNominatimZoom(scale: string | null | undefined): string {
  switch (scale) {
    case 'neighborhood': return '16'
    case 'city': return '10'
    case 'region': return '8'
    case 'national': return '5'
    case 'global': return '3'
    default: return '10'
  }
}

function showArea(result: { geojson?: GeoJSON.Geometry, boundingbox?: [string, string, string, string] }) {
  if (!map || !L) return

  let center: [number, number] | null = null

  if (result.geojson && (result.geojson.type === 'Polygon' || result.geojson.type === 'MultiPolygon')) {
    areaLayer = L.geoJSON(result.geojson, { style: areaStyle }).addTo(map)
    const c = areaLayer.getBounds().getCenter()
    center = [c.lat, c.lng]
  }
  else if (result.boundingbox) {
    const [south, north, west, east] = result.boundingbox.map(Number)
    const bounds = L.latLngBounds([[south, west], [north, east]])
    areaLayer = L.rectangle(bounds, { ...areaStyle, opacity: 0.4, fillOpacity: 0.06 }).addTo(map)
    const c = bounds.getCenter()
    center = [c.lat, c.lng]
  }

  if (center) {
    areaCenter = center
    map.setView(center, scaleToZoom(props.scale))
  }
}

onMounted(initMap)
onBeforeUnmount(() => { map?.remove(); map = null; areaLayer = null; L = null })

defineExpose({
  invalidateSize: () => {
    if (!map) return
    map.invalidateSize()
    const center = areaCenter || [props.latitude, props.longitude]
    map.setView(center, scaleToZoom(props.scale))
  },
})
</script>

<template>
  <div ref="mapEl" class="location-map" />
</template>

<style scoped>
.location-map {
  width: 100%;
  height: 100%;
}

:deep(.leaflet-control-zoom) {
  border: none !important;
  border-radius: 0.5rem !important;
  overflow: hidden !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12) !important;
}
:deep(.leaflet-control-zoom a) {
  background: white !important;
  color: #6b7280 !important;
  border: none !important;
  border-bottom: 1px solid #f3f4f6 !important;
  width: 32px !important;
  height: 32px !important;
  line-height: 32px !important;
  font-size: 16px !important;
}
:deep(.leaflet-control-zoom a:last-child) {
  border-bottom: none !important;
}
:deep(.leaflet-control-zoom a:hover) {
  background: #f9fafb !important;
  color: #374151 !important;
}
</style>
