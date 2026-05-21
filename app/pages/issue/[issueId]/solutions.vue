<script setup lang="ts">
const route = useRoute()
const issueId = computed(() => route.params.issueId)
const { track } = useUmami()

// Solutions can no longer be nested under other solutions — hide the
// "Propose a solution" affordance when the parent is itself a solution.
const parentIssue = inject<Ref<{ type: 'issue' | 'solution' } | null>>('issue', ref(null))
const allowPropose = computed(() => parentIssue.value?.type !== 'solution')

const sort = ref('trending')
const search = ref('')
const sortOptions = [
  { label: 'Trending', value: 'trending' },
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Most Voted', value: 'most_voted' },
]

const queryParams = computed(() => {
  const params: Record<string, string> = {}
  if (sort.value !== 'trending') params.sort = sort.value
  if (search.value.trim()) params.search = search.value.trim()
  return params
})

const { data: solutions } = await useFetch(() => `/api/issue/${issueId.value}/solutions`, {
  query: queryParams,
  watch: [queryParams],
})

const { loggedIn } = useUserSession()
const { data: banStatus } = await useFetch('/api/user/ban-status', {
  immediate: loggedIn.value,
  watch: false,
})
</script>

<template>
  <div class="mt-4 flex flex-col max-w-3xl mx-auto gap-4">
    <div class="flex items-stretch gap-3">
      <UiSearchAndSortBar
        v-model:search="search"
        v-model:sort="sort"
        :sort-options="sortOptions"
        placeholder="Search solutions..."
      />
      <AuthState v-slot="{ loggedIn: isLoggedIn }">
        <UiActionButton
          v-if="allowPropose && isLoggedIn && !banStatus?.banned"
          :to="`/new?parent=${issueId}&type=solution`"
          @click="track('Open solution form')"
        >
          Propose a solution
        </UiActionButton>
      </AuthState>
    </div>

    <BanNotice
      v-if="banStatus?.banned"
      :ban-status="banStatus"
      @appealed="refreshNuxtData()"
    />

    <CardIssue
      v-for="solution in solutions"
      :key="solution.id"
      :issue="solution"
    />

    <template v-if="solutions?.length === 0">
      <p v-if="search.trim()" class="text-toned text-center py-8">
        No solutions match your search.
      </p>
      <UiEmptyState
        v-else-if="allowPropose"
        icon="lucide:lightbulb"
        title="No solutions proposed yet"
        description="Got an idea that could move the needle? Share it — the community will vote and iterate on it."
        cta-label="Propose a solution"
        :cta-to="`/new?parent=${issueId}&type=solution`"
        cta-event="Empty state cta solutions"
      />
      <UiEmptyState
        v-else
        icon="lucide:lightbulb-off"
        title="Solutions can't nest under solutions"
        description="To document a real-world implementation of this solution, add a case study from the Studies tab."
        cta-label="Open case studies"
        :cta-to="`/issue/${issueId}/studies`"
      />
    </template>
  </div>
</template>
