<script setup lang="ts">
const { track } = useUmami()
const route = useRoute()
const tagSlug = computed(() => route.params.slug as string)

const sort = ref((route.query.sort as string) || 'newest')
const search = ref((route.query.search as string) || '')

const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Most Voted', value: 'most_voted' },
  { label: 'Trending', value: 'trending' },
]

const queryParams = computed(() => {
  const params: Record<string, string> = {}
  if (sort.value) params.sort = sort.value
  if (search.value.trim()) params.search = search.value.trim()
  return params
})

const { data } = await useFetch(() => `/api/tag/${tagSlug.value}`, {
  query: queryParams,
  watch: [queryParams],
})

const nodes = computed(() => data.value?.nodes ?? [])
// The tag page lists every kind of node related to the tag. Tags attach to the
// issues table, which holds issues (top-level or sub-issue) and solutions;
// split by `type` so each kind gets its own section. Case studies carry no tags
// themselves — the API surfaces those attached to a tagged solution.
const issueNodes = computed(() => nodes.value.filter((n) => n.type !== 'solution'))
const solutionNodes = computed(() => nodes.value.filter((n) => n.type === 'solution'))
const caseStudyNodes = computed(() => data.value?.caseStudies ?? [])
const total = computed(() => nodes.value.length + caseStudyNodes.value.length)

const hasSearch = computed(() => Boolean(search.value.trim()))

// Issues and solutions render the same card, so drive them from one list; case
// studies use their own card and stay a separate section in the template.
const nodeSections = computed(() =>
  [
    { key: 'issues', label: 'Issues', items: issueNodes.value },
    { key: 'solutions', label: 'Solutions', items: solutionNodes.value },
  ].filter((s) => s.items.length > 0),
)

// SEO Meta tags
useSeoMeta({
  title: () => `${tagSlug.value} - CommunityFix Tags`,
  description: () =>
    `Explore issues, solutions, and case studies for #${tagSlug.value} on CommunityFix. Browse ${total.value} node${total.value === 1 ? '' : 's'} related to ${tagSlug.value} and join the discussion.`,
  keywords: () =>
    `${tagSlug.value}, community issues, community solutions, community fix, ${tagSlug.value} problems, local solutions, collaborative problem solving`,
  ogTitle: () => `#${tagSlug.value} - Community Issues & Solutions`,
  ogDescription: () =>
    `Browse ${total.value} issue${total.value === 1 ? '' : 's'} and solutions tagged #${tagSlug.value} on CommunityFix.`,
  ogType: 'website',
  twitterCard: 'summary',
  twitterTitle: () => `#${tagSlug.value} - CommunityFix`,
  twitterDescription: () => `Discover community issues and solutions related to ${tagSlug.value}.`,
})

defineOgImage('Community', {
  title: `#${tagSlug.value}`,
  kind: 'Tag',
})

const tagName = computed(() => tagSlug.value)
const tagUrl = computed(() => `${SITE_URL}/tag/${tagSlug.value}`)

useJsonLd([
  breadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: tagName.value, url: tagUrl.value },
  ]),
  {
    '@type': 'CollectionPage',
    name: tagName.value,
    url: tagUrl.value,
    isPartOf: { '@id': WEBSITE_ID },
  },
])

const allTags = computed(() => {
  const tagMap = new Map<string, number>()

  nodes.value.forEach((node) => {
    if (node.tags && Array.isArray(node.tags)) {
      node.tags.forEach((tag) => {
        if (tag && tag !== tagSlug.value) {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
        }
      })
    }
  })

  return Array.from(tagMap.entries())
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count)
})

function trackRelatedTag(tag: string) {
  track('Related tag click', { tag })
}
</script>

<template>
  <AppContainer class="container overflow-x-clip h-fit mx-auto p-4">
    <div class="w-full my-12 sm:my-28 gap-4 sm:gap-6 text-center flex flex-col items-center justify-center">
      <h1 class="font-mono text-4xl sm:text-5xl underline decoration-primary">
        <!--
          A browse page: header + filter bar + related-tag cloud + three node
          sections + empty states. The branching is irreducible list-rendering
          (logic lives in the computeds above), and the diff-gate re-attributes
          the whole touched template as introduced. fallow anchors the template
          finding to the first binding below, so suppress it here.
        -->
        <!-- fallow-ignore-next-line complexity -->
        #{{ tagSlug }}
      </h1>
      <p class="text-lg sm:text-2xl font-title text-primary-950">
        Issues, solutions, and case studies for {{ tagSlug }}
      </p>
    </div>
    <!-- Filter bar -->
    <div class="max-w-3xl mx-auto mb-6">
      <UiSearchAndSortBar
        v-model:search="search"
        v-model:sort="sort"
        placeholder="Search this topic..."
        :sort-options="sortOptions"
      />
    </div>
    <div v-if="allTags.length > 0" class="max-w-3xl mx-auto mb-12">
      <h2 class="text-lg font-title text-primary-950 mb-4">
        Related tags:
      </h2>
      <UiTagList collapsible :tags="allTags" @select="trackRelatedTag" />
    </div>
    <div v-if="total > 0" class="flex flex-col max-w-3xl mx-auto gap-10">
      <section
        v-for="s in nodeSections"
        :key="s.key"
        class="flex flex-col gap-6"
        :aria-label="s.label"
      >
        <UiSectionTitle>
          {{ s.label }}
          <span class="text-gray-400 font-normal">
            {{ s.items.length }}
          </span>
        </UiSectionTitle>
        <CardIssue v-for="node in s.items" :key="node.id" :issue="node" />
      </section>
      <section v-if="caseStudyNodes.length > 0" aria-label="Case studies" class="flex flex-col gap-6">
        <UiSectionTitle>
          Case studies
          <span class="text-gray-400 font-normal">
            {{ caseStudyNodes.length }}
          </span>
        </UiSectionTitle>
        <CardCaseStudy v-for="study in caseStudyNodes" :key="study.id" :study="study" />
      </section>
    </div>
    <UiEmptyState
      v-else-if="hasSearch"
      description="Try a different search term."
      icon="lucide:search-x"
      :title="`No nodes match your search in #${tagSlug}`"
    />
    <UiEmptyState
      v-else
      description="Nothing has been tagged with this topic yet."
      icon="lucide:tag"
      :title="`No nodes found tagged #${tagSlug}`"
    />
  </AppContainer>
</template>
