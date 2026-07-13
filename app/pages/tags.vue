<script setup lang="ts">
const { track } = useUmami()

const { data: tags } = await useFetch('/api/tags')

const filter = ref('')

// /api/tags is ordered by usage; keep unused tags out of the index — a link
// to an empty tag page is a dead end.
const visibleTags = computed(() => {
  const q = filter.value.trim().toLowerCase()
  return (tags.value ?? [])
    .filter((t) => t.uses > 0)
    .filter((t) => !q || t.slug.includes(q) || t.name.toLowerCase().includes(q))
})

const maxUses = computed(() => Math.max(1, ...visibleTags.value.map((t) => t.uses)))

useSeoMeta({
  title: 'Topics',
  description:
    'Every topic in the CommunityFix catalog. Pick a topic to browse its issues and solutions.',
  ogTitle: 'Topics – CommunityFix',
  ogDescription: 'Browse community issues and solutions by topic.',
})

defineOgImage('Community', { title: 'Topics', kind: 'Directory' })

useJsonLd([
  breadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Topics', url: `${SITE_URL}/tags` },
  ]),
  {
    '@type': 'CollectionPage',
    name: 'Topics',
    url: `${SITE_URL}/tags`,
    isPartOf: { '@id': WEBSITE_ID },
  },
])
</script>

<template>
  <AppContainer class="container overflow-x-clip h-fit mx-auto p-4">
    <UiPageHeader
      description="Every topic the community has used to organize the catalog. Pick one to browse its issues and solutions."
      title="Topics"
    />
    <div class="flex items-stretch mb-6 rounded-md overflow-hidden border border-gray-200">
      <UInput
        v-model="filter"
        class="flex-1"
        icon="i-lucide-search"
        placeholder="Filter topics..."
        size="md"
        variant="none"
      />
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <NuxtLink
        v-for="tag in visibleTags"
        :key="tag.slug"
        class="group relative overflow-hidden flex items-center gap-3 rounded-md border border-gray-200 bg-white/60 px-3 py-2 hover:bg-primary-50 hover:border-primary-200 transition-colors"
        :to="`/tag/${tag.slug}`"
        @click="track('Topics page tag click', { tag: tag.slug })"
      >
        <!-- Sharp usage bar along the bottom edge — line, not pill -->
        <span
          class="absolute bottom-0 left-0 h-0.5 bg-primary-200 group-hover:bg-primary-400 transition-colors"
          :style="{ width: `${Math.round((tag.uses / maxUses) * 100)}%` }"
        />
        <span class="font-mono text-sm text-gray-700 truncate group-hover:underline decoration-2 decoration-primary">
          #{{ tag.slug }}
        </span>
        <span class="ml-auto font-mono text-xs text-gray-400 tabular-nums">
          {{ tag.uses }}
        </span>
      </NuxtLink>
    </div>
    <p v-if="visibleTags.length" class="font-mono text-xs text-gray-400 mt-4">
      {{ visibleTags.length }} topic{{ visibleTags.length === 1 ? '' : 's' }}
    </p>
    <UiEmptyState
      v-else
      description="No topic matches that filter."
      icon="lucide:search-x"
      title="Nothing found"
    />
  </AppContainer>
</template>
