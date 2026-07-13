<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { track } = useUmami()

const STATUSES = [
  { label: 'All', value: '' },
  { label: 'Plan', value: 'plan' },
  { label: 'In progress', value: 'in-progress' },
  { label: 'Done', value: 'done' },
]

const search = ref((route.query.search as string) || '')
const sort = ref((route.query.sort as string) || 'most_voted')
const status = ref((route.query.status as string) || '')

const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Most Voted', value: 'most_voted' },
]

const queryParams = computed(() => {
  const params: Record<string, string> = {}
  if (sort.value && sort.value !== 'most_voted') params.sort = sort.value
  if (search.value.trim()) params.search = search.value.trim()
  if (status.value) params.status = status.value
  return params
})

const { data: solutions } = await useFetch('/api/solutions', {
  query: queryParams,
  watch: [queryParams],
})

watch(
  queryParams,
  (params) => {
    router.replace({ query: params })
  },
  { deep: true },
)

function selectStatus(value: string) {
  status.value = value
  track('Filter solutions', { status: value || 'all' })
}

const hasFilters = computed(() => Boolean(search.value.trim() || status.value))

useSeoMeta({
  title: 'Solutions',
  description:
    'Every solution the community has proposed, from first plans to finished projects. Open one to see the issue it addresses and where it has been tried.',
  ogTitle: 'Solutions – CommunityFix',
  ogDescription: 'Browse every proposed solution in the catalog and see where each has been tried.',
})

defineOgImage('Community', { title: 'Solutions', kind: 'Directory' })

useJsonLd([
  breadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Solutions', url: `${SITE_URL}/solutions` },
  ]),
  {
    '@type': 'CollectionPage',
    name: 'Solutions',
    url: `${SITE_URL}/solutions`,
    isPartOf: { '@id': WEBSITE_ID },
  },
])
</script>

<template>
  <AppContainer class="container overflow-x-clip h-fit mx-auto p-4">
    <UiPageHeader
      description="Every solution the community has proposed, from first plans to finished projects. Open one to see the issue it addresses and where it has been tried."
      title="Solutions"
    />
    <div class="flex flex-col gap-3 mb-6">
      <UiSearchAndSortBar
        v-model:search="search"
        v-model:sort="sort"
        placeholder="Search solutions..."
        :sort-options="sortOptions"
      />
      <div class="flex flex-wrap gap-2">
        <button
          v-for="s in STATUSES"
          :key="s.value"
          class="rounded-full px-3 py-1 text-sm font-mono border transition-colors"
          type="button"
          :class="status === s.value
            ? 'bg-primary-50 text-primary-600 border-primary-200'
            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'"
          @click="selectStatus(s.value)"
        >
          {{ s.label }}
        </button>
      </div>
    </div>
    <p v-if="solutions" class="font-mono text-sm text-gray-500 mb-4">
      {{ solutions.length }} solution{{ solutions.length === 1 ? '' : 's' }}
    </p>
    <div class="flex flex-col gap-6">
      <CardIssue v-for="solution in solutions ?? []" :key="solution.id" :issue="solution" />
      <UiEmptyState
        v-if="solutions && solutions.length === 0 && hasFilters"
        description="Try a different search term or remove a filter."
        icon="lucide:search-x"
        title="No solutions match these filters"
      />
      <UiEmptyState
        v-else-if="solutions && solutions.length === 0"
        cta-label="Browse issues"
        cta-to="/issues"
        description="Solutions are proposed on an issue. Open one and propose the first."
        title="No solutions yet"
      />
    </div>
  </AppContainer>
</template>
