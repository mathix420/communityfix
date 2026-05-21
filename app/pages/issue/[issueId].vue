<script setup lang="ts">
const route = useRoute()
const issueId = computed(() => route.params.issueId)
const { data: issue } = await useFetch(() => `/api/issue/${issueId.value}`)

// Solutions can't have sub-solutions, so the Solutions tab is meaningless on
// a solution page — case studies replace it. Inverse for issues: no case
// studies tab there (the studies route still resolves for direct links).
const tabs = computed(() => {
  const isSolution = issue.value?.type === 'solution'
  const base = [
    { name: 'Overview', path: `/issue/${issueId.value}` },
    { name: 'Issues', path: `/issue/${issueId.value}/issues` },
  ]
  if (isSolution) {
    base.push({ name: 'Case Studies', path: `/issue/${issueId.value}/studies` })
  }
  else {
    base.push({ name: 'Solutions', path: `/issue/${issueId.value}/solutions` })
  }
  base.push(
    { name: 'Funding', path: `/issue/${issueId.value}/funding` },
    { name: 'Tree View', path: `/issue/${issueId.value}/tree` },
  )
  return base
})

// Make the loaded row available to nested route children (e.g. studies.vue
// switches between solution-mode and issue-mode based on `issue.type`).
provide('issue', issue)

if (issue.value) {
  useSeoMeta({
    title: issue.value.title,
    description: issue.value.summary || `Learn about ${issue.value.title} and discover community-driven solutions on CommunityFix.`,
    ogTitle: `${issue.value.title} - CommunityFix`,
    ogDescription: issue.value.summary || `Join the discussion and contribute solutions for ${issue.value.title} on CommunityFix.`,
    keywords: `${issue.value.title}, community solutions, ${issue.value.tags?.join(', ') || 'collaborative projects'}`,
  })

  defineOgImage('CommunityFix', {
    title: issue.value.title,
    description: issue.value.summary,
    number: issue.value.id,
  })
}
</script>

<template>
  <AppContainer v-if="issue">
    <div class="flex sm:items-center justify-between mb-4 sm:flex-row flex-col-reverse">
      <h1 :class="underlinedTitle">
        {{ issue.title }}
      </h1>
      <p class="text-5xl text-black/10 font-mono sm:mt-0 -mt-5">
        #{{ issue.id.toString().padStart(5, '0') }}
      </p>
    </div>
    <UiMarkdown
      :value="issue.summary"
      class="text-toned text-lg my-8"
    />

    <UiNavTabs :tabs="tabs" />

    <NuxtPage />
  </AppContainer>
  <AppContainer v-else>
    <div class="flex items-center justify-center h-screen">
      <p class="text-toned text-lg">
        Loading...
      </p>
    </div>
  </AppContainer>
</template>
