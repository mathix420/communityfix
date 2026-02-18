<script setup lang="ts">
const route = useRoute()
const issueId = computed(() => route.params.issueId)
const { data: issue } = await useFetch(() => `/api/issue/${issueId.value}`)

const tabs = [
  { name: 'Overview', path: `/issue/${issueId.value}` },
  { name: 'Issues', path: `/issue/${issueId.value}/issues` },
  { name: 'Solutions', path: `/issue/${issueId.value}/solutions` },
  { name: 'Studies', path: `/issue/${issueId.value}/studies` },
  { name: 'Funding', path: `/issue/${issueId.value}/funding` },
]

// SEO Meta Tags for Issue Page
if (issue.value) {
  useSeoMeta({
    title: issue.value.title,
    description: issue.value.description || `Learn about ${issue.value.title} and discover community-driven solutions on CommunityFix.`,
    ogTitle: `${issue.value.title} - CommunityFix`,
    ogDescription: issue.value.description || `Join the discussion and contribute solutions for ${issue.value.title} on CommunityFix.`,
    keywords: `${issue.value.title}, community solutions, ${issue.value.tags?.join(', ') || 'collaborative projects'}`,
  })

  defineOgImage('CommunityFix', {
    title: issue.value.title,
    description: issue.value.description,
    number: issue.value.id,
    solutionCount: issue.value.solutionCount,
    subIssueCount: issue.value.subIssueCount,
    commentCount: issue.value.commentCount,
    sourceCount: issue.value.sourceCount,
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
    <p class="text-toned text-lg my-8">
      {{ issue.description }}
    </p>

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
