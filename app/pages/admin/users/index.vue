<script setup lang="ts">
// USelectMenu rejects empty-string item values, so we use 'all' as the
// no-filter sentinel and strip it from the request.
const ALL = 'all'
const search = ref('')
const filter = ref(ALL)
const page = ref(1)
const limit = 25

const filterOptions = [
  { label: 'All', value: ALL },
  { label: 'Banned', value: 'banned' },
  { label: 'Pending appeal', value: 'ban_appeal' },
]

const debouncedSearch = ref('')
let timer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    debouncedSearch.value = search.value.trim()
    page.value = 1
  }, 300)
})

const query = computed(() => ({
  page: page.value,
  limit,
  ...(debouncedSearch.value && { q: debouncedSearch.value }),
  ...(filter.value !== ALL && { filter: filter.value }),
}))

const { data } = await useFetch('/api/admin/users', { query })

const totalPages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / limit)))

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
function isBanned(u: { bannedUntil: string | null }) {
  return !!u.bannedUntil && new Date(u.bannedUntil) > new Date()
}

watch(filter, () => {
  page.value = 1
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap gap-2 items-center">
      <UInput
        v-model="search"
        class="flex-1 min-w-[220px]"
        icon="lucide:search"
        placeholder="Search by name, email, or ID..."
      />
      <USelectMenu
        v-model="filter"
        class="w-44"
        placeholder="Filter"
        value-key="value"
        :items="filterOptions"
      />
      <span class="font-mono text-[10px] text-gray-400 uppercase tracking-widest ml-auto">
        {{ data?.total ?? 0 }} user{{ (data?.total ?? 0) === 1 ? '' : 's' }}
      </span>
    </div>
    <UiCard v-if="data?.users?.length" padding="none">
      <div class="divide-y divide-gray-100">
        <NuxtLink
          v-for="u in data.users"
          :key="u.id"
          class="block px-4 py-3 hover:bg-gray-50/60 transition-colors"
          :to="`/admin/users/${u.id}`"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="font-medium truncate">
                  {{ u.name || u.email }}
                </p>
                <UiBadge v-if="isBanned(u)" variant="error">
                  banned
                </UiBadge>
                <UiBadge v-else-if="u.banAppealStatus === 'pending'" variant="warning">
                  appeal pending
                </UiBadge>
              </div>
              <p class="text-xs text-toned truncate">
                {{ u.email }}
              </p>
              <p class="text-[11px] text-toned mt-0.5 font-mono">
                {{ u.id }}
              </p>
            </div>
            <div class="text-right text-xs space-y-0.5 shrink-0">
              <p>
                <span class="text-toned">
                  trust
                </span>
                <span class="ml-1 font-mono" :class="u.trustScore < 0 ? 'text-red-600' : ''">
                  {{ u.trustScore }}
                </span>
              </p>
              <p class="text-toned">
                {{ u.issueCount }} submitted ·
                <span :class="u.rejectedCount > 0 ? 'text-red-600' : ''">
                  {{ u.rejectedCount }} rejected
                </span>
              </p>
              <p class="text-toned">
                joined {{ formatDate(u.createdAt) }}
              </p>
            </div>
          </div>
        </NuxtLink>
      </div>
    </UiCard>
    <UiEmptyState
      v-else
      compact
      description="Try widening your filters or clearing the search."
      icon="lucide:users"
      title="No users match"
    />
    <div v-if="totalPages > 1" class="flex justify-center gap-2">
      <UButton size="sm" variant="ghost" :disabled="page <= 1" @click="page--">
        Previous
      </UButton>
      <span class="text-sm text-toned self-center">
        Page {{ page }} of {{ totalPages }}
      </span>
      <UButton size="sm" variant="ghost" :disabled="page >= totalPages" @click="page++">
        Next
      </UButton>
    </div>
  </div>
</template>
