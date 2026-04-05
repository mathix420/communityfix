<script setup lang="ts">
const route = useRoute()
const router = useRouter()

const search = ref((route.query.search as string) || '')
const sort = ref((route.query.sort as string) || 'newest')

const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Most Voted', value: 'most_voted' },
  { label: 'Trending', value: 'trending' },
]

const queryParams = computed(() => {
  const params: Record<string, string> = {}
  if (sort.value && sort.value !== 'newest') params.sort = sort.value
  if (search.value.trim()) params.search = search.value.trim()
  return params
})

const { data: issues } = await useFetch('/api/issues', {
  query: queryParams,
  watch: [queryParams],
})

// Sync URL query params
watch(queryParams, (params) => {
  router.replace({ query: { ...route.query, ...params, ...(!params.sort && { sort: undefined }), ...(!params.search && { search: undefined }) } })
}, { deep: true })

let searchTimeout: ReturnType<typeof setTimeout>
function onSearchInput(val: string) {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    search.value = val
  }, 300)
}

// SEO Meta Tags for Homepage
useSeoMeta({
  title: 'Community Solutions Hub',
  description: 'Find and co-create solutions to local and global issues. Join CommunityFix to share skills, back ideas, and collaborate on impact projects.',
  ogTitle: 'CommunityFix – Put Your Skills to Work',
  ogDescription: 'Discover community-driven solutions and collaborate on projects that matter. Join CommunityFix to contribute skills, knowledge, and support.',
  keywords: 'community solutions, collaborative projects, skill sharing, social impact, CommunityFix platform',
})

defineOgImage('Home')
</script>

<template>
  <AppContainer class="container overflow-x-clip h-fit mx-auto p-4">
    <div class="w-full my-28 gap-4 sm:gap-6 text-center flex flex-col items-center justify-center">
      <h1 class="font-mono text-4xl sm:text-5xl underline decoration-primary">
        communityfix.org
      </h1>
      <p class="text-lg sm:text-2xl font-title text-primary-950">
        Let's put our skills to work.
      </p>
    </div>

    <p class="text-center text-lg sm:text-xl font-title text-primary-950 mb-8">
      The community is actively working on these issues:
    </p>

    <!-- Filter bar -->
    <div class="flex items-stretch gap-3 max-w-3xl mx-auto mb-6">
      <div class="flex items-stretch flex-1 rounded-md overflow-hidden border border-gray-200 [&_[data-slot=base]]:rounded-none">
        <UInput
          :model-value="search"
          placeholder="Search issues..."
          icon="i-lucide-search"
          size="md"
          variant="none"
          class="flex-1"
          @update:model-value="onSearchInput"
        />
        <USelectMenu
          v-model="sort"
          :items="sortOptions"
          value-key="value"
          size="md"
          variant="none"
          class="w-44 border-l border-gray-200"
        />
      </div>
      <AuthState v-slot="{ loggedIn }">
        <UButton
          v-if="loggedIn"
          to="/new"
          color="primary"
          size="md"
          data-umami-event="Homepage new issue"
        >
          New Issue
        </UButton>
      </AuthState>
    </div>

    <div class="flex flex-col max-w-3xl mx-auto gap-6">
      <div v-if="issues && issues.length === 0" class="text-center text-gray-500 py-12">
        <p class="text-lg">No issues found.</p>
        <p v-if="search" class="text-sm mt-1">
          Try a different search term.
        </p>
      </div>
      <CardIssue
        v-for="issue in issues"
        :key="issue.id"
        :issue="issue"
      />
    </div>
  </AppContainer>
</template>
