<script setup lang="ts">
const route = useRoute()
const issueId = computed(() => route.params.issueId)
const { track } = useUmami()

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

const { data: subIssues } = await useFetch(() => `/api/issue/${issueId.value}/issues`, {
  query: queryParams,
  watch: [queryParams],
})
</script>

<template>
  <div class="mt-4 flex flex-col max-w-3xl mx-auto gap-4">
    <div
      v-if="(subIssues?.length ?? 0) > 0 || search.trim()"
      class="flex items-stretch gap-3"
    >
      <UiSearchAndSortBar
        v-model:search="search"
        v-model:sort="sort"
        :sort-options="sortOptions"
        placeholder="Search sub-issues..."
      />
      <UiActionButton
        :to="`/new?parent=${issueId}&type=issue`"
        @click="track('Open sub-issue form')"
      >
        Propose a sub-issue
      </UiActionButton>
    </div>

    <CardIssue
      v-for="issue in subIssues"
      :key="issue.id"
      :issue="issue"
    />

    <UiEmptyState
      v-if="subIssues?.length === 0 && !search.trim()"
      icon="lucide:circle-alert"
      title="Help break this problem down"
      description="Each sub-issue gives the community a sharper target to rally around."
      cta-label="Add a sub-issue"
      :cta-to="`/new?parent=${issueId}&type=issue`"
      cta-event="Empty state cta sub-issues"
    />
    <p
      v-else-if="subIssues?.length === 0"
      class="text-toned text-center py-8"
    >
      No sub-issues match your search.
    </p>
  </div>
</template>
