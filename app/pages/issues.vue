<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { track } = useUmami()

const search = ref((route.query.search as string) || '')
const sort = ref((route.query.sort as string) || 'most_voted')
const tag = ref((route.query.tag as string) || '')
const sdg = ref((route.query.sdg as string) || '')

const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Most Voted', value: 'most_voted' },
  { label: 'Trending', value: 'trending' },
]

const [{ data: tags }, { data: sdgs }] = await Promise.all([
  useFetch('/api/tags'),
  useFetch('/api/sdgs'),
])

const tagOptions = computed(() => [
  { label: 'All topics', value: '' },
  ...(tags.value ?? [])
    .filter((t) => t.uses > 0)
    .map((t) => ({ label: `#${t.slug} (${t.uses})`, value: t.slug })),
])

const sdgOptions = computed(() => [
  { label: 'All UN goals', value: '' },
  ...(sdgs.value ?? [])
    .filter((s) => s.uses > 0)
    .map((s) => ({ label: `${s.id}. ${s.name}`, value: String(s.id) })),
])

const queryParams = computed(() => {
  const params: Record<string, string> = {}
  if (sort.value && sort.value !== 'most_voted') params.sort = sort.value
  if (search.value.trim()) params.search = search.value.trim()
  if (tag.value) params.tag = tag.value
  if (sdg.value) params.sdg = sdg.value
  return params
})

const { data: issues } = await useFetch('/api/issues', {
  query: queryParams,
  watch: [queryParams],
})

watch(
  queryParams,
  (params) => {
    router.replace({ query: params })
    track('Filter issues', {
      tag: tag.value || undefined,
      sdg: sdg.value || undefined,
      sort: sort.value,
    })
  },
  { deep: true },
)

const hasFilters = computed(() => Boolean(search.value.trim() || tag.value || sdg.value))
function resetFilters() {
  search.value = ''
  tag.value = ''
  sdg.value = ''
}

useSeoMeta({
  title: 'Browse Issues',
  description:
    'The full directory of community-documented issues. Filter by topic, UN Sustainable Development Goal, or search the catalog.',
  ogTitle: 'Browse Issues – CommunityFix',
  ogDescription:
    'Explore every issue the community is working on. Filter by topic, UN goal, or keyword.',
})

defineOgImage('Community', { title: 'Issues', kind: 'Directory' })

useJsonLd([
  breadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Issues', url: `${SITE_URL}/issues` },
  ]),
  {
    '@type': 'CollectionPage',
    name: 'Issues',
    url: `${SITE_URL}/issues`,
    isPartOf: { '@id': WEBSITE_ID },
  },
])
</script>

<template>
  <AppContainer class="container overflow-x-clip h-fit mx-auto p-4">
    <UiPageHeader
      description="Every problem the community has documented. Open an issue to see its sub-issues, proposed solutions, and what's been tried."
      title="Issues"
    />
    <div class="flex flex-col gap-3 mb-6">
      <div class="flex items-stretch gap-3">
        <UiSearchAndSortBar
          v-model:search="search"
          v-model:sort="sort"
          placeholder="Search issues..."
          :sort-options="sortOptions"
        />
        <UiActionButton class="max-sm:hidden" to="/new" @click="track('Issues page new issue')">
          New Issue
        </UiActionButton>
      </div>
      <div class="flex flex-col sm:flex-row gap-3">
        <USelectMenu
          v-model="tag"
          class="flex-1"
          placeholder="All topics"
          size="md"
          value-key="value"
          :items="tagOptions"
          :search-input="{ placeholder: 'Find a topic...' }"
        />
        <USelectMenu
          v-model="sdg"
          class="flex-1"
          placeholder="All UN goals"
          size="md"
          value-key="value"
          :items="sdgOptions"
          :search-input="{ placeholder: 'Find a goal...' }"
        />
        <UButton
          v-if="hasFilters"
          class="self-start sm:self-center"
          color="neutral"
          icon="i-lucide-x"
          size="sm"
          variant="ghost"
          @click="resetFilters"
        >
          Reset
        </UButton>
      </div>
    </div>
    <p v-if="issues" class="font-mono text-sm text-gray-500 mb-4">
      {{ issues.length }} issue{{ issues.length === 1 ? '' : 's' }}
    </p>
    <div class="flex flex-col gap-6">
      <CardIssue v-for="issue in issues ?? []" :key="issue.id" :issue="issue" />
      <UiEmptyState
        v-if="issues && issues.length === 0 && hasFilters"
        description="Try a different search term or remove a filter."
        icon="lucide:search-x"
        title="No issues match these filters"
      />
      <UiEmptyState
        v-else-if="issues && issues.length === 0"
        cta-label="Report an issue"
        cta-to="/new"
        description="Be the first to document a problem worth solving."
        title="No issues yet"
      />
    </div>
  </AppContainer>
</template>
