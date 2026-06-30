<script setup lang="ts">
const route = useRoute()
const issueId = computed(() => route.params.issueId)
const { data: issue } = await useFetch(() => `/api/issue/${issueId.value}`)

// Parent issue (if any) so the breadcrumb can name it.
const { data: parentIssue } = await useFetch(() => `/api/issue/${issue.value?.parentId}`, {
  immediate: !!issue.value?.parentId,
  watch: false,
})

// Solutions can't have sub-solutions, so the Solutions tab is meaningless on
// a solution page — case studies replace it. Inverse for issues: no case
// studies tab there (the studies route still resolves for direct links).
const tabs = computed(() => {
  const isSolution = issue.value?.type === 'solution'
  const base = [{ name: 'Overview', path: `/issue/${issueId.value}` }]
  if (isSolution) {
    base.push({ name: 'Case Studies', path: `/issue/${issueId.value}/studies` })
  } else {
    base.push({ name: 'Solutions', path: `/issue/${issueId.value}/solutions` })
  }
  base.push(
    { name: 'Issues', path: `/issue/${issueId.value}/issues` },
    { name: 'Funding', path: `/issue/${issueId.value}/funding` },
    { name: 'Tree View', path: `/issue/${issueId.value}/tree` },
  )
  return base
})

// Make the loaded row available to nested route children (e.g. studies.vue
// switches between solution-mode and issue-mode based on `issue.type`).
provide('issue', issue)

// Distinct <title> per sub-tab. Reactive getter because the parent stays
// mounted across tabs; the brand suffix is added by the global titleTemplate.
const tabSuffix = computed(() => {
  const path = route.path
  if (path.endsWith('/solutions')) return ' — Solutions'
  if (path.endsWith('/issues')) return ' — Sub-issues'
  if (path.endsWith('/studies')) return ' — Case studies'
  if (path.endsWith('/funding')) return ' — Funding'
  if (path.endsWith('/tree')) return ' — Tree'
  return '' // Overview (index)
})

if (issue.value) {
  useSeoMeta({
    title: () => `${issue.value!.title}${tabSuffix.value}`,
    description:
      issue.value.summary ||
      `Learn about ${issue.value.title} and discover community-driven solutions on CommunityFix.`,
    ogTitle: `${issue.value.title} - CommunityFix`,
    ogDescription:
      issue.value.summary ||
      `Join the discussion and contribute solutions for ${issue.value.title} on CommunityFix.`,
    ogType: 'article',
    keywords: `${issue.value.title}, community solutions, ${issue.value.tags?.join(', ') || 'collaborative projects'}`,
  })

  defineOgImage('Community', {
    title: issue.value.title,
    kind: issue.value.type === 'solution' ? 'Solution' : 'Issue',
    id: issue.value.id,
  })

  const crumbs = [{ name: 'Home', url: SITE_URL }]
  if (parentIssue.value) {
    crumbs.push({
      name: parentIssue.value.title,
      url: `${SITE_URL}/issue/${parentIssue.value.id}`,
    })
  }
  crumbs.push({
    name: issue.value.title,
    url: `${SITE_URL}/issue/${issue.value.id}`,
  })

  useJsonLd([
    breadcrumbSchema(crumbs),
    articleSchema({
      title: issue.value.title,
      description: issue.value.summary || issue.value.description || undefined,
      url: `${SITE_URL}/issue/${issue.value.id}`,
      datePublished: issue.value.date || undefined,
      authorName:
        issue.value.author && issue.value.author !== 'Anonymous' ? issue.value.author : undefined,
    }),
  ])
}
</script>

<template>
  <AppContainer v-if="issue">
    <div class="flex justify-between mb-4 flex-col-reverse">
      <h1 :class="underlinedTitle">
        {{ issue.title }}
      </h1>
      <p class="text-5xl text-black/10 font-mono -mt-5">
        #{{ issue.id.toString().padStart(5, '0') }}
      </p>
    </div>
    <UiMarkdown class="text-toned text-lg my-8" :value="issue.summary" />
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
