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
          v-if="isLoggedIn && !banStatus?.banned"
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

    <p
      v-if="solutions?.length === 0"
      class="text-toned text-center py-8"
    >
      {{ search.trim() ? 'No solutions match your search.' : 'No solutions proposed yet.' }}
    </p>
  </div>
</template>
