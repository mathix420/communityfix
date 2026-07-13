<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { track } = useUmami()

const OUTCOMES = [
  { label: 'All', value: '' },
  { label: 'Success', value: 'success' },
  { label: 'Ongoing', value: 'ongoing' },
  { label: 'Partial', value: 'partial' },
  { label: 'Failed', value: 'failed' },
  { label: 'Inconclusive', value: 'inconclusive' },
]

const scaleOptions = [
  { label: 'Any scale', value: '' },
  { label: 'Neighborhood', value: 'neighborhood' },
  { label: 'City', value: 'city' },
  { label: 'Region', value: 'region' },
  { label: 'National', value: 'national' },
  { label: 'Global', value: 'global' },
]

const query = ref((route.query.query as string) || '')
const outcome = ref((route.query.outcome as string) || '')
const scale = ref((route.query.scale as string) || '')

let queryTimeout: ReturnType<typeof setTimeout>
function onQueryInput(val: string | number) {
  clearTimeout(queryTimeout)
  queryTimeout = setTimeout(() => {
    query.value = String(val)
  }, 400)
}
onUnmounted(() => clearTimeout(queryTimeout))

function selectOutcome(value: string) {
  outcome.value = value
  track('Filter case studies', { outcome: value || 'all', scale: scale.value || 'any' })
}

const queryParams = computed(() => {
  const params: Record<string, string> = { limit: '50' }
  if (query.value.trim()) params.query = query.value.trim()
  if (outcome.value) params.outcome = outcome.value
  if (scale.value) params.scale = scale.value
  return params
})

const { data } = await useFetch('/api/case-studies', {
  query: queryParams,
  watch: [queryParams],
})
const studies = computed(() => data.value?.items)
// True when a semantic query was sent but embeddings were unavailable — the
// list is then a recency fallback, not a similarity ranking.
const degraded = computed(() => Boolean(data.value?.degraded))

watch(queryParams, (params) => {
  router.replace({ query: { ...params, limit: undefined } })
})

const hasFilters = computed(() => Boolean(query.value.trim() || outcome.value || scale.value))

useSeoMeta({
  title: 'Case Studies',
  description:
    'Documented real-world implementations of community solutions: where they were tried, what they cost, and whether they worked. Filter by outcome and scale.',
  ogTitle: 'Case Studies – CommunityFix',
  ogDescription:
    'What has actually worked, and where? Browse documented implementations, including the failures.',
})

defineOgImage('Community', { title: 'Case Studies', kind: 'Directory' })

useJsonLd([
  breadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Case studies', url: `${SITE_URL}/case-studies` },
  ]),
  {
    '@type': 'CollectionPage',
    name: 'Case studies',
    url: `${SITE_URL}/case-studies`,
    isPartOf: { '@id': WEBSITE_ID },
  },
])
</script>

<template>
  <AppContainer class="container overflow-x-clip h-fit mx-auto p-4">
    <UiPageHeader
      description="Real-world implementations of the catalog's solutions: where they were tried, what they cost, and how it went. Failures are documented too, so they aren't repeated."
      title="Case studies"
    />
    <div class="flex flex-col gap-3 mb-6">
      <div class="flex flex-col sm:flex-row items-stretch gap-3">
        <div class="flex items-stretch flex-1 rounded-md overflow-hidden border border-gray-200">
          <UInput
            class="flex-1"
            icon="i-lucide-search"
            placeholder="Describe what you're looking for..."
            size="md"
            variant="none"
            :model-value="query"
            @update:model-value="onQueryInput"
          />
        </div>
        <USelectMenu
          v-model="scale"
          class="w-full sm:w-44"
          size="md"
          value-key="value"
          :items="scaleOptions"
          @update:model-value="track('Filter case studies', { outcome: outcome || 'all', scale: scale || 'any' })"
        />
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="o in OUTCOMES"
          :key="o.value"
          class="rounded-full px-3 py-1 text-sm font-mono border transition-colors"
          type="button"
          :class="outcome === o.value
            ? 'bg-primary-50 text-primary-600 border-primary-200'
            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'"
          @click="selectOutcome(o.value)"
        >
          {{ o.label }}
        </button>
      </div>
    </div>
    <p v-if="degraded" class="font-mono text-sm text-amber-600 mb-2">
      Semantic search is temporarily unavailable — showing the most recent case studies instead.
    </p>
    <p v-if="studies" class="font-mono text-sm text-gray-500 mb-4">
      Showing {{ studies.length }} case stud{{ studies.length === 1 ? 'y' : 'ies' }}
    </p>
    <div class="flex flex-col gap-6">
      <CardCaseStudy v-for="study in studies ?? []" :key="study.id" :study="study" />
      <UiEmptyState
        v-if="studies && studies.length === 0 && hasFilters"
        description="Try a broader search or remove a filter."
        icon="lucide:search-x"
        title="No case studies match these filters"
      />
      <UiEmptyState
        v-else-if="studies && studies.length === 0"
        description="Case studies document real-world implementations of solutions. Open a solution and add one from its Studies tab."
        icon="lucide:map-pin"
        title="No case studies yet"
      />
    </div>
  </AppContainer>
</template>
