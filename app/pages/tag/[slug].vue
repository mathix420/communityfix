<script setup lang="ts">
const route = useRoute()
const tagSlug = computed(() => route.params.slug)
const { data: issues } = await useFetch(() => `/api/issues?tag=${tagSlug.value}`)

// SEO Meta tags
useSeoMeta({
  title: () => `${tagSlug.value} - CommunityFix Tags`,
  description: () => `Explore community issues tagged with #${tagSlug.value}. Find ${issues.value?.length || 0} issues related to ${tagSlug.value} and join the discussion.`,
  keywords: () => `${tagSlug.value}, community issues, community fix, ${tagSlug.value} problems, local solutions, collaborative problem solving`,
  ogTitle: () => `#${tagSlug.value} - Community Issues`,
  ogDescription: () => `Browse ${issues.value?.length || 0} community issues tagged with #${tagSlug.value} on CommunityFix.`,
  ogType: 'website',
  twitterCard: 'summary',
  twitterTitle: () => `#${tagSlug.value} - CommunityFix`,
  twitterDescription: () => `Discover community issues and solutions related to ${tagSlug.value}.`,
})

const allTags = computed(() => {
  if (!issues.value) return []

  const tagMap = new Map()

  issues.value.forEach((issue) => {
    if (issue.tags && Array.isArray(issue.tags)) {
      issue.tags.forEach((tag) => {
        if (tag && tag !== tagSlug.value) {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
        }
      })
    }
  })

  return Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
})
</script>

<template>
  <AppContainer class="container overflow-x-clip h-fit mx-auto p-4">
    <div class="w-full my-28 gap-4 sm:gap-6 text-center flex flex-col items-center justify-center">
      <h1 class="font-mono text-4xl sm:text-5xl underline decoration-primary">
        #{{ tagSlug }}
      </h1>
      <p class="text-lg sm:text-2xl font-title text-primary-950">
        Issues tagged with {{ tagSlug }}
      </p>
    </div>

    <p
      v-if="issues && issues.length > 0"
      class="text-center text-lg sm:text-xl font-title text-primary-950 mb-8"
    >
      Found {{ issues.length }} issue{{ issues.length === 1 ? '' : 's' }} with this tag:
    </p>

    <div
      v-if="allTags.length > 0"
      class="max-w-3xl mx-auto mb-12"
    >
      <h2 class="text-lg font-title text-primary-950 mb-4">
        Related tags:
      </h2>
      <div class="flex flex-wrap gap-2">
        <NuxtLink
          v-for="{ tag, count } in allTags"
          :key="tag"
          :to="`/tag/${tag}`"
          data-umami-event="Related tag click"
          :data-umami-event-tag="tag"
          class="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-100 hover:bg-primary-200 text-primary-800 rounded-full transition-colors"
          :class="{
            'text-sm': count < 3,
            'text-base font-medium': count >= 3 && count < 5,
            'text-lg font-semibold': count >= 5,
          }"
        >
          <span>#{{ tag }}</span>
          <span class="text-xs text-primary-600">({{ count }})</span>
        </NuxtLink>
      </div>
    </div>

    <div
      v-if="issues && issues.length > 0"
      class="flex flex-col max-w-3xl mx-auto gap-6"
    >
      <CardIssue
        v-for="issue in issues"
        :key="issue.id"
        :issue="issue"
      />
    </div>

    <div
      v-else
      class="text-center text-lg text-toned mt-12"
    >
      <p>No issues found with tag "{{ tagSlug }}"</p>
    </div>
  </AppContainer>
</template>
