<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { track } = useUmami()

const search = ref((route.query.search as string) || '')
const sort = ref((route.query.sort as string) || 'most_voted')

const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Most Voted', value: 'most_voted' },
  { label: 'Trending', value: 'trending' },
]

const queryParams = computed(() => {
  const params: Record<string, string> = {}
  if (sort.value && sort.value !== 'most_voted') params.sort = sort.value
  if (search.value.trim()) params.search = search.value.trim()
  return params
})

// The list below only needs the sort; searching switches to the catalog-wide
// quick search instead of filtering this list.
const issuesParams = computed(() => ({
  ...(sort.value && sort.value !== 'most_voted' && { sort: sort.value }),
}))
const quickParams = computed(() => ({ q: search.value.trim() }))

const [{ data: stats }, { data: issues }, { data: tags }, { data: results }] = await Promise.all([
  useFetch('/api/stats'),
  useFetch('/api/issues', { query: issuesParams, watch: [issuesParams] }),
  useFetch('/api/tags'),
  // Skip the first-paint fetch when there's nothing to search; typing (or a
  // ?search= param) triggers it via the watch.
  useFetch('/api/search/quick', {
    query: quickParams,
    watch: [quickParams],
    immediate: Boolean(search.value.trim()),
  }),
])

const searching = computed(() => Boolean(search.value.trim()))
const resultGroups = computed(() => [
  { label: 'Issues', items: results.value?.issues ?? [], kind: 'issue' as const },
  { label: 'Solutions', items: results.value?.solutions ?? [], kind: 'issue' as const },
  { label: 'Case studies', items: results.value?.caseStudies ?? [], kind: 'case-study' as const },
])
const resultCount = computed(() => resultGroups.value.reduce((a, g) => a + g.items.length, 0))

// /api/tags is ordered by usage — the head of the list makes a good quick-nav.
const topTags = computed(() => (tags.value ?? []).filter((t) => t.uses > 0).slice(0, 8))

watch(
  queryParams,
  (params) => {
    router.replace({
      query: {
        ...route.query,
        ...params,
        ...(!params.sort && { sort: undefined }),
        ...(!params.search && { search: undefined }),
      },
    })
  },
  { deep: true },
)

// The stat strip is also the way into every other section of the site.
const statItems = computed(() => [
  { label: 'issues', value: stats.value?.issues ?? 0, to: '/issues' },
  { label: 'solutions', value: stats.value?.solutions ?? 0, to: '/solutions' },
  { label: 'case studies', value: stats.value?.caseStudies ?? 0, to: '/case-studies' },
  { label: 'topics', value: stats.value?.topics ?? 0, to: '/tags' },
])

const NuxtLink = resolveComponent('NuxtLink')

interface ExploreLink {
  label: string
  description: string
  icon: string
  to: string
  event: string
  // Half-width card (vs third-width), used for the reading links so the
  // grid stays balanced: 6 content cards in rows of 3, then 2 wide cards.
  wide?: boolean
}

const exploreLinks = computed<ExploreLink[]>(() => [
  {
    label: 'Issues',
    description: `The full directory of ${stats.value?.issues ?? 0} issues, filterable by topic or UN goal`,
    icon: 'lucide:circle-alert',
    to: '/issues',
    event: 'Homepage explore issues',
  },
  {
    label: 'Solutions',
    description: `${stats.value?.solutions ?? 0} proposed approaches, from first plans to finished projects`,
    icon: 'lucide:lightbulb',
    to: '/solutions',
    event: 'Homepage explore solutions',
  },
  {
    label: 'Case studies',
    description: `${stats.value?.caseStudies ?? 0} documented implementations, including the failures`,
    icon: 'lucide:map-pin',
    to: '/case-studies',
    event: 'Homepage explore case studies',
  },
  {
    label: 'Map',
    description: 'Everything in the catalog that names a place',
    icon: 'lucide:globe',
    to: '/map',
    event: 'Homepage explore map',
  },
  {
    label: 'Topics',
    description: `${stats.value?.topics ?? 0} topics to browse the catalog by`,
    icon: 'lucide:tags',
    to: '/tags',
    event: 'Homepage explore topics',
  },
  {
    label: 'Contribute',
    description: 'Nodes that need evidence, sources, or costs. Pick one and improve it',
    icon: 'lucide:hand-heart',
    to: '/contribute',
    event: 'Homepage explore contribute',
  },
  {
    label: 'Guides',
    description: 'How to write issues, solutions, and case studies worth replicating',
    icon: 'lucide:book-open',
    to: '/guides',
    event: 'Homepage explore guides',
    wide: true,
  },
  {
    label: 'Whitepaper',
    description: 'Why CommunityFix exists, its principles, and how the catalog is meant to be used',
    icon: 'lucide:file-text',
    to: '/whitepaper',
    event: 'Homepage explore whitepaper',
    wide: true,
  },
])

useSeoMeta({
  title: 'Community Solutions Hub',
  description:
    'Find and co-create solutions to local and global issues. Browse documented problems, proposed solutions, and real-world case studies on CommunityFix.',
  ogTitle: 'CommunityFix – Put Your Skills to Work',
  ogDescription:
    'Discover community-driven solutions and collaborate on projects that matter. Join CommunityFix to contribute skills, knowledge, and support.',
  keywords:
    'community solutions, collaborative projects, skill sharing, social impact, CommunityFix platform',
})

defineOgImage('Home')
</script>

<template>
  <AppContainer class="container overflow-x-clip h-fit mx-auto p-4">
    <div class="w-full mt-10 sm:mt-24 mb-8 sm:mb-12 gap-4 sm:gap-5 text-center flex flex-col items-center justify-center">
      <h1 class="font-mono font-medium text-4xl sm:text-5xl text-neutral-700 max-w-2xl">
        Everyone's skills, put to good use.
      </h1>
      <p class="max-w-xl text-lg text-gray-600">
        Communities document what they tried and what actually worked, so no one solves it twice.
      </p>
    </div>
    <!-- Catalog counters double as the way into each section — one quiet line -->
    <div class="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-mono text-sm text-gray-500 mb-8 sm:mb-12">
      <template v-for="(item, i) in statItems" :key="item.label">
        <span v-if="i > 0" class="text-gray-300 select-none">
          ·
        </span>
        <component
          :is="item.to ? NuxtLink : 'span'"
          :class="item.to && 'interactive-underline'"
          :to="item.to ?? undefined"
          @click="item.to && track('Homepage stat click', { stat: item.label })"
        >
          <span class="font-medium text-gray-900 tabular-nums">
            {{ item.value }}
          </span>
          {{ item.label }}
        </component>
      </template>
    </div>
    <div class="flex flex-col sm:flex-row items-stretch gap-3 max-w-3xl mx-auto mb-6">
      <UiSearchAndSortBar
        v-model:search="search"
        v-model:sort="sort"
        placeholder="Search the catalog..."
        :sort-options="sortOptions"
      />
      <UiActionButton to="/new" @click="track('Homepage new issue')">
        New Issue
      </UiActionButton>
    </div>
    <!-- Quick-nav into the most active topics -->
    <div class="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto mb-6">
      <NuxtLink
        v-for="tag in topTags"
        :key="tag.slug"
        :to="`/tag/${tag.slug}`"
        @click="track('Homepage topic click', { tag: tag.slug })"
      >
        <UiTag size="sm">
          {{ tag.slug }}
        </UiTag>
      </NuxtLink>
      <NuxtLink to="/tags" @click="track('Homepage view all topics')">
        <UiTag size="sm">
          all topics →
        </UiTag>
      </NuxtLink>
    </div>
    <!-- Searching covers the whole catalog; otherwise show the issue list -->
    <div v-if="searching" class="flex flex-col max-w-3xl mx-auto gap-8">
      <section
        v-for="group in resultGroups.filter((g) => g.items.length)"
        :key="group.label"
        class="flex flex-col gap-4"
      >
        <p class="font-mono uppercase tracking-wider text-xs text-gray-500">
          {{ group.label }} · {{ group.items.length }}
        </p>
        <template v-if="group.kind === 'issue'">
          <CardIssue v-for="item in group.items" :key="item.id" :issue="item" />
        </template>
        <template v-else>
          <CardCaseStudy v-for="item in group.items" :key="item.id" :study="item" />
        </template>
      </section>
      <div v-if="resultCount === 0" class="text-center text-gray-500 py-12">
        <p class="text-lg">
          Nothing in the catalog matches that search.
        </p>
        <p class="text-sm mt-1">
          Try a different term, or document it as a new issue.
        </p>
      </div>
    </div>
    <div v-else class="flex flex-col max-w-3xl mx-auto gap-6">
      <div v-if="issues && issues.length === 0" class="text-center text-gray-500 py-12">
        <p class="text-lg">
          No issues found.
        </p>
      </div>
      <CardIssue v-for="issue in issues" :key="issue.id" :issue="issue" />
    </div>
    <!-- Keep exploring: quiet hand-off to the rest of the catalog.
         6-col grid: content cards span 2 (3 per row), reading cards span 3. -->
    <div class="grid grid-cols-1 sm:grid-cols-6 gap-3 max-w-3xl mx-auto mt-6">
      <NuxtLink
        v-for="link in exploreLinks"
        :key="link.to"
        class="group flex flex-col gap-1.5 rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm p-4 hover:border-primary-200 transition-colors"
        :class="link.wide ? 'sm:col-span-3' : 'sm:col-span-2'"
        :to="link.to"
        @click="track(link.event)"
      >
        <span class="flex items-center gap-2 font-mono text-sm text-gray-900">
          <UIcon class="size-4 text-primary-600" :name="link.icon" />
          <span>
            {{ link.label }}
          </span>
          <UIcon
            class="size-3.5 ml-auto text-gray-300 group-hover:text-primary-500 transition-colors"
            name="lucide:arrow-right"
          />
        </span>
        <span class="text-xs text-gray-500 leading-snug">
          {{ link.description }}
        </span>
      </NuxtLink>
    </div>
  </AppContainer>
</template>
