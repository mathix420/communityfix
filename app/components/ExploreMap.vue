<script setup lang="ts">
// World map of every geolocated node and case study (see /api/map). Same
// Leaflet setup and Voyager tiles as LocationMap, but with many points and
// link-through popups instead of a single pin + area.
export interface MapPoint {
  kind: 'issue' | 'solution' | 'case-study'
  id: number
  title: string
  locationName: string | null
  outcome: string | null
  lat: number
  lng: number
}

const props = defineProps<{ points: MapPoint[] }>()
const emit = defineEmits<{ open: [kind: MapPoint['kind']] }>()

const mapEl = ref<HTMLElement>()
let map: any = null
let L: any = null

// Semantic palette, tuned for the light Voyager tiles: problems read as red,
// proposals carry the brand blue, implemented work reads as green.
const KIND_COLORS: Record<MapPoint['kind'], string> = {
  issue: '#e11d48',
  solution: '#2563eb',
  'case-study': '#059669',
}

const KIND_LABELS: Record<MapPoint['kind'], string> = {
  issue: 'Issue',
  solution: 'Solution',
  'case-study': 'Case study',
}

function escapeHtml(s: string): string {
  return s.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c]!,
  )
}

function popupHtml(p: MapPoint): string {
  const href = p.kind === 'case-study' ? `/case-study/${p.id}` : `/issue/${p.id}`
  const meta = [KIND_LABELS[p.kind], p.outcome && p.kind === 'case-study' ? p.outcome : null]
    .filter(Boolean)
    .join(' · ')
  const place =
    p.kind !== 'case-study' && p.locationName
      ? `<div class="explore-popup-place">${escapeHtml(p.locationName)}</div>`
      : ''
  return `<div class="explore-popup">
    <div class="explore-popup-kind" style="color:${KIND_COLORS[p.kind]}">${escapeHtml(meta)}</div>
    <a href="${href}" class="explore-popup-title">${escapeHtml(p.title)}</a>
    ${place}
  </div>`
}

async function initMap() {
  if (!mapEl.value || map) return

  await import('leaflet/dist/leaflet.css')
  const leaflet = await import('leaflet')
  L = leaflet.default || leaflet

  map = L.map(mapEl.value, {
    center: [20, 0],
    zoom: 2,
    zoomControl: false,
    attributionControl: false,
    worldCopyJump: true,
  })

  L.control.zoom({ position: 'bottomright' }).addTo(map)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd',
  }).addTo(map)

  renderPoints()
}

function renderPoints() {
  if (!map || !L || props.points.length === 0) return

  const bounds = L.latLngBounds([])
  for (const p of props.points) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue
    const marker = L.circleMarker([p.lat, p.lng], {
      radius: 7,
      color: '#ffffff',
      weight: 1.5,
      fillColor: KIND_COLORS[p.kind],
      fillOpacity: 0.85,
    }).addTo(map)
    marker.bindPopup(popupHtml(p), { closeButton: false })
    marker.on('popupopen', () => emit('open', p.kind))
    bounds.extend([p.lat, p.lng])
  }

  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [32, 32] as [number, number], maxZoom: 6 })
  }
}

onMounted(initMap)
onBeforeUnmount(() => {
  map?.remove()
  map = null
  L = null
})
</script>

<template>
  <div ref="mapEl" class="explore-map" />
</template>

<style scoped>
.explore-map {
  width: 100%;
  height: 100%;
}
/* Zoom-control styling is shared in assets/css/leaflet.css */
:deep(.leaflet-popup-content-wrapper) {
  border-radius: .75rem;
  box-shadow: 0 4px 16px #00000024;
}

:deep(.leaflet-popup-content) {
  margin: .75rem .9rem;
}

:deep(.explore-popup) {
  display: flex;
  flex-direction: column;
  gap: .2rem;
  max-width: 220px;
}

:deep(.explore-popup-kind) {
  font-family: var(--font-mono);
  font-size: .65rem;
  text-transform: uppercase;
  letter-spacing: .06em;
}

:deep(.explore-popup-title) {
  font-size: .85rem;
  font-weight: 500;
  color: #111827;
  line-height: 1.3;
  text-decoration-color: var(--color-primary-500, #2563eb);
}

:deep(.explore-popup-title:hover) {
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-decoration-color: var(--color-primary-500, #2563eb);
}

:deep(.explore-popup-place) {
  font-size: .7rem;
  color: #6b7280;
}
</style>
