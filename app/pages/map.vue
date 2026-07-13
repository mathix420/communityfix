<script setup lang="ts">
import type { MapPoint } from '~/components/ExploreMap.vue'

const { track } = useUmami()

const { data: points } = await useFetch('/api/map')

// Keep in sync with KIND_COLORS in ExploreMap.vue.
const KINDS = [
  { kind: 'issue' as const, label: 'Issues', color: '#e11d48' },
  { kind: 'solution' as const, label: 'Solutions', color: '#2563eb' },
  { kind: 'case-study' as const, label: 'Case studies', color: '#059669' },
]

const enabled = ref<Record<string, boolean>>({
  issue: true,
  solution: true,
  'case-study': true,
})

const visiblePoints = computed<MapPoint[]>(
  () => (points.value ?? []).filter((p) => enabled.value[p.kind]) as MapPoint[],
)

function countOf(kind: string): number {
  return (points.value ?? []).filter((p) => p.kind === kind).length
}

function toggleKind(kind: string) {
  enabled.value[kind] = !enabled.value[kind]
  track('Map layer toggle', { kind, on: enabled.value[kind] })
}

// ExploreMap draws its markers once on mount, so remount it when the layer
// selection changes.
const layerKey = computed(() => KINDS.map((k) => Number(enabled.value[k.kind])).join(''))

useSeoMeta({
  title: 'Map',
  description:
    'Every geolocated issue, solution, and case study in the CommunityFix catalog on one map. See what communities near you are working on.',
  ogTitle: 'Map – CommunityFix',
  ogDescription: 'Explore community issues, solutions, and case studies around the world.',
})

defineOgImage('Community', { title: 'Map', kind: 'Explore' })

useJsonLd([
  breadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Map', url: `${SITE_URL}/map` },
  ]),
])
</script>

<template>
  <div class="h-dvh">
    <h1 class="sr-only">
      Map of every geolocated issue, solution, and case study
    </h1>
    <!-- Fullscreen map; the fixed glass header floats above it, the footer
         stays behind (z-10 beats the static footer content). The background
         keeps the footer from showing through while Leaflet loads. -->
    <div class="fixed inset-0 z-10 bg-gray-100">
      <ClientOnly>
        <ExploreMap
          :key="layerKey"
          :points="visiblePoints"
          @open="(kind) => track('Map marker click', { kind })"
        />
        <template #fallback>
          <div class="h-full flex items-center justify-center font-mono text-sm text-gray-400">
            Loading map…
          </div>
        </template>
      </ClientOnly>
    </div>
    <!-- Legend doubles as layer toggles -->
    <div class="fixed top-14 inset-x-0 z-20 flex flex-wrap justify-center gap-2 px-4 pointer-events-none">
      <button
        v-for="k in KINDS"
        :key="k.kind"
        class="pointer-events-auto inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-mono border backdrop-blur-md shadow-sm transition-colors"
        type="button"
        :class="enabled[k.kind]
          ? 'bg-white/70 text-gray-700 border-gray-200'
          : 'bg-white/40 text-gray-400 border-gray-200/60'"
        @click="toggleKind(k.kind)"
      >
        <span
          class="size-2.5 rounded-full"
          :style="{ backgroundColor: enabled[k.kind] ? k.color : '#d1d5db' }"
        />
        {{ k.label }}
        <span class="text-xs text-gray-400 tabular-nums">
          {{ countOf(k.kind) }}
        </span>
      </button>
    </div>
    <!-- Quiet hand-off back to the list views -->
    <div class="fixed bottom-4 left-4 z-20 flex items-center gap-1.5 rounded-full bg-white/70 backdrop-blur-md border border-gray-200 shadow-sm px-3 py-1 font-mono text-xs text-gray-500">
      <span>
        Browse all:
      </span>
      <NuxtLink
        class="text-gray-700 interactive-underline"
        to="/issues"
        @click="track('Map to issues')"
      >
        issues
      </NuxtLink>
      <span class="text-gray-300">
        ·
      </span>
      <NuxtLink
        class="text-gray-700 interactive-underline"
        to="/case-studies"
        @click="track('Map to case studies')"
      >
        case studies
      </NuxtLink>
    </div>
  </div>
</template>
