<script setup lang="ts">
import type { LocationScale } from '../../server/database/schema'

const latitude = defineModel<number | undefined>('latitude')
const longitude = defineModel<number | undefined>('longitude')
const locationName = defineModel<string>('locationName', { default: '' })
const scale = defineModel<LocationScale | undefined>('scale')

const scaleOptions = [
  { label: 'Neighborhood', value: 'neighborhood' },
  { label: 'City', value: 'city' },
  { label: 'Region', value: 'region' },
  { label: 'Nation', value: 'national' },
  { label: 'World', value: 'global' },
]

// Scale auto-detection
const SCALE_MAP: Record<string, LocationScale> = {
  continent: 'global',
  country: 'national',
  state: 'region',
  province: 'region',
  region: 'region',
  county: 'region',
  city: 'city',
  town: 'city',
  village: 'city',
  municipality: 'city',
  suburb: 'neighborhood',
  neighbourhood: 'neighborhood',
  quarter: 'neighborhood',
  borough: 'neighborhood',
  hamlet: 'neighborhood',
}

// Search (unified with location name input)
interface NominatimResult {
  display_name: string
  lat: string
  lon: string
  boundingbox?: [string, string, string, string]
  geojson?: GeoJSON.Geometry
  addresstype?: string
  type?: string
}

const searchResults = ref<NominatimResult[]>([])
const searching = ref(false)
const showResults = ref(false)
const inputFocused = ref(false)

let searchTimer: ReturnType<typeof setTimeout>
watch(locationName, (q) => {
  clearTimeout(searchTimer)
  if (!inputFocused.value || q.length < 3) {
    searchResults.value = []
    showResults.value = false
    return
  }
  searchTimer = setTimeout(async () => {
    searching.value = true
    try {
      const data = await $fetch<NominatimResult[]>(
        'https://nominatim.openstreetmap.org/search',
        {
          query: { q, format: 'json', limit: '5', polygon_geojson: '1', polygon_threshold: '0.005' },
          headers: { 'Accept-Language': 'en' },
        },
      )
      searchResults.value = data
      showResults.value = data.length > 0
    }
    catch { searchResults.value = [] }
    finally { searching.value = false }
  }, 350)
})

function selectResult(r: NominatimResult) {
  const lat = parseFloat(r.lat)
  const lng = parseFloat(r.lon)
  latitude.value = parseFloat(lat.toFixed(6))
  longitude.value = parseFloat(lng.toFixed(6))
  locationName.value = r.display_name.split(',').slice(0, 3).join(',').trim()
  showResults.value = false
  searchResults.value = []

  // Auto-detect scale
  const key = r.addresstype || r.type || ''
  if (SCALE_MAP[key]) {
    scale.value = SCALE_MAP[key]
  }

  // Show area boundary + fit bounds
  showArea(r)
}

function onInputFocus() {
  inputFocused.value = true
}

function onInputBlur() {
  inputFocused.value = false
  setTimeout(() => { showResults.value = false }, 200)
}

// Leaflet map
const mapEl = ref<HTMLElement>()
let map: any = null
let marker: any = null
let areaLayer: any = null
let L: any = null
const mapReady = ref(false)
const hasLocation = computed(() => latitude.value !== undefined && longitude.value !== undefined)

async function initMap() {
  if (!mapEl.value || map) return

  await import('leaflet/dist/leaflet.css')
  const leaflet = await import('leaflet')
  L = leaflet.default || leaflet

  const center: [number, number] = hasLocation.value
    ? [latitude.value!, longitude.value!]
    : [30, 0]
  const zoom = hasLocation.value ? 12 : 2

  map = L.map(mapEl.value, {
    center,
    zoom,
    zoomControl: false,
    attributionControl: false,
  })

  L.control.zoom({ position: 'bottomright' }).addTo(map)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd',
  }).addTo(map)

  if (hasLocation.value) {
    placeMarker(latitude.value!, longitude.value!)
  }

  map.on('click', (e: any) => {
    const { lat, lng } = e.latlng
    latitude.value = parseFloat(lat.toFixed(6))
    longitude.value = parseFloat(lng.toFixed(6))
    clearArea()
    placeMarker(lat, lng)
    reverseGeocode(lat, lng)
  })

  mapReady.value = true
}

function createPinIcon() {
  return L.divIcon({
    className: '',
    html: '<div class="location-pin"></div>',
    iconSize: [28, 38],
    iconAnchor: [14, 38],
  })
}

function placeMarker(lat: number, lng: number) {
  if (!L || !map) return
  if (marker) {
    marker.setLatLng([lat, lng])
  }
  else {
    marker = L.marker([lat, lng], { icon: createPinIcon(), draggable: true }).addTo(map)
    marker.on('dragend', (e: any) => {
      const p = e.target.getLatLng()
      latitude.value = parseFloat(p.lat.toFixed(6))
      longitude.value = parseFloat(p.lng.toFixed(6))
      reverseGeocode(p.lat, p.lng)
    })
  }
}

function showArea(r: NominatimResult) {
  if (!map || !L) return
  clearArea()

  const lat = parseFloat(r.lat)
  const lng = parseFloat(r.lon)
  placeMarker(lat, lng)

  // Draw GeoJSON boundary if available (polygon/multipolygon)
  if (r.geojson && (r.geojson.type === 'Polygon' || r.geojson.type === 'MultiPolygon')) {
    areaLayer = L.geoJSON(r.geojson, {
      style: {
        color: 'var(--color-primary-500, #2563eb)',
        weight: 2,
        opacity: 0.6,
        fillOpacity: 0.08,
        dashArray: '6 4',
      },
    }).addTo(map)
    map.flyToBounds(areaLayer.getBounds(), { padding: [30, 30], duration: 0.8 })
  }
  else if (r.boundingbox) {
    // Fall back to bounding box rectangle
    const [south, north, west, east] = r.boundingbox.map(Number)
    const bounds = L.latLngBounds([[south, west], [north, east]])
    areaLayer = L.rectangle(bounds, {
      color: 'var(--color-primary-500, #2563eb)',
      weight: 2,
      opacity: 0.4,
      fillOpacity: 0.06,
      dashArray: '6 4',
    }).addTo(map)
    map.flyToBounds(bounds, { padding: [30, 30], duration: 0.8 })
  }
  else {
    map.flyTo([lat, lng], 13, { duration: 0.8 })
  }
}

function clearArea() {
  if (areaLayer && map) {
    map.removeLayer(areaLayer)
    areaLayer = null
  }
}

async function reverseGeocode(lat: number, lng: number) {
  try {
    const data = await $fetch<{ display_name: string }>(
      'https://nominatim.openstreetmap.org/reverse',
      { query: { lat: String(lat), lon: String(lng), format: 'json' }, headers: { 'Accept-Language': 'en' } },
    )
    if (data.display_name) {
      locationName.value = data.display_name.split(',').slice(0, 3).join(',').trim()
    }
  }
  catch {}
}

function clearLocation() {
  latitude.value = undefined
  longitude.value = undefined
  locationName.value = ''
  scale.value = undefined
  clearArea()
  if (marker && map) {
    map.removeLayer(marker)
    marker = null
    map.flyTo([30, 0], 2, { duration: 0.5 })
  }
}

onMounted(initMap)
onBeforeUnmount(() => { map?.remove(); map = null; marker = null; areaLayer = null })
</script>

<template>
  <div class="space-y-3">
    <!-- Location input + scale row -->
    <div class="flex gap-2 items-end">
      <UFormField label="Location" name="locationName" class="relative flex-1 min-w-0">
        <UInput
          :model-value="locationName"
          type="text"
          placeholder="Search or type a location..."
          size="lg"
          icon="lucide:map-pin"
          :loading="searching"
          class="w-full"
          @update:model-value="locationName = $event"
          @focus="onInputFocus"
          @blur="onInputBlur"
          @keydown.enter.prevent
        />

        <!-- Results dropdown -->
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div
            v-if="showResults && searchResults.length"
            class="absolute z-[1000] w-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
          >
            <button
              v-for="(r, i) in searchResults"
              :key="i"
              type="button"
              class="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 flex items-start gap-2.5"
              @mousedown.prevent="selectResult(r)"
            >
              <UIcon name="lucide:map-pin" class="size-4 text-gray-400 mt-0.5 shrink-0" />
              <span class="text-gray-700 line-clamp-2 leading-snug">{{ r.display_name }}</span>
            </button>
          </div>
        </Transition>
      </UFormField>

      <UFormField label="Scale" name="scale" class="shrink-0 w-40">
        <USelectMenu
          v-model="scale"
          :items="scaleOptions"
          value-key="value"
          placeholder="Scale..."
          size="lg"
          class="w-full"
        />
      </UFormField>
    </div>

    <!-- Map -->
    <div class="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100 map-container">
      <div ref="mapEl" class="absolute inset-0" />

      <!-- Hint overlay -->
      <Transition
        enter-active-class="transition duration-300"
        enter-from-class="opacity-0"
        leave-active-class="transition duration-200"
        leave-to-class="opacity-0"
      >
        <div
          v-if="mapReady && !hasLocation"
          class="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none"
        >
          <div class="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-gray-500 flex items-center gap-1.5 shadow-sm border border-gray-100">
            <UIcon name="lucide:mouse-pointer-click" class="size-3.5" />
            Click the map or search above
          </div>
        </div>
      </Transition>

      <!-- Clear button -->
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0 scale-90"
        leave-active-class="transition duration-150"
        leave-to-class="opacity-0 scale-90"
      >
        <button
          v-if="hasLocation"
          type="button"
          class="absolute top-2.5 left-2.5 z-[400] bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-xs font-mono text-gray-500 hover:text-red-600 hover:bg-red-50/90 transition-colors border border-gray-200/80 flex items-center gap-1 shadow-sm"
          @click="clearLocation"
        >
          <UIcon name="lucide:x" class="size-3" />
          Clear
        </button>
      </Transition>
    </div>

    <!-- Coordinates -->
    <div
      v-if="hasLocation"
      class="flex items-center gap-2 text-xs text-gray-400 font-mono pl-1"
    >
      <UIcon name="lucide:crosshair" class="size-3 shrink-0" />
      {{ latitude!.toFixed(6) }}, {{ longitude!.toFixed(6) }}
    </div>
  </div>
</template>

<style scoped>
.map-container {
  height: 220px;
}

/* Custom map pin marker */
.location-pin {
  width: 24px;
  height: 24px;
  background: var(--color-primary-500, #2563eb);
  border: 3px solid white;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.25);
}

/* Leaflet zoom control overrides */
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
  transition: background 0.15s ease !important;
}
:deep(.leaflet-control-zoom a:last-child) {
  border-bottom: none !important;
}
:deep(.leaflet-control-zoom a:hover) {
  background: #f9fafb !important;
  color: #374151 !important;
}
</style>
