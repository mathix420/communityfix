<script setup lang="ts">
const route = useRoute()
const issueId = computed(() => route.params.issueId)
const { data: issue, refresh: refreshIssue } = await useFetch(() => `/api/issue/${issueId.value}`)

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
  // History is intentionally left off the primary tab bar — it's a niche view.
  // Owners/admins still reach it via the pending-proposals banner; direct links
  // (and the /history route) keep working.
  return base
})

// Make the loaded row available to nested route children (e.g. studies.vue
// switches between solution-mode and issue-mode based on `issue.type`; history.vue
// reads authorId).
provide('issue', issue)

// Edit / Suggest-edit entry point + collaborative-revision wiring. Owner/admin
// edit directly; other logged-in users propose a change; logged-out users are
// bounced to /login. Pending proposals (owner/admin only) surface a banner that
// links to the History tab.
const { track } = useUmami()
const { loggedIn } = useUserSession()
const { isAdmin } = usePendingRevisions()

// Ownership is resolved server-side from node_members and returned on the issue.
const isOwner = computed(() => !!issue.value?.viewerIsOwner)
const canApply = computed(() => isOwner.value || isAdmin.value)

const editKind = computed<'issue' | 'solution'>(() =>
  issue.value?.type === 'solution' ? 'solution' : 'issue',
)
const editLabel = computed(() => (canApply.value ? 'Edit' : 'Propose changes'))

const editOpen = ref(false)
function openEdit() {
  if (!loggedIn.value) {
    navigateTo('/login')
    return
  }
  track('Open edit modal', { kind: editKind.value, mode: canApply.value ? 'edit' : 'suggest' })
  editOpen.value = true
}

async function onEdited() {
  await refreshIssue()
  await refreshPendingCount()
}

// Cheap pending-proposal count for the owner/admin banner. Only fetched for
// people who could act on it; anyone else never sees the callout.
const { data: revisionRows, refresh: refreshPendingCount } = await useFetch<{ status: string }[]>(
  () => `/api/issue/${issueId.value}/revisions`,
  { key: 'issue-pending-banner', default: () => [], immediate: false },
)
watchEffect(() => {
  if (canApply.value && issue.value) refreshPendingCount()
})
const pendingCount = computed(() =>
  canApply.value ? (revisionRows.value ?? []).filter((r) => r.status === 'pending').length : 0,
)
const onHistoryTab = computed(() => route.path.endsWith('/history'))

// Distinct <title> per sub-tab. Reactive getter because the parent stays
// mounted across tabs; the brand suffix is added by the global titleTemplate.
const tabSuffix = computed(() => {
  const path = route.path
  if (path.endsWith('/solutions')) return ' — Solutions'
  if (path.endsWith('/issues')) return ' — Sub-issues'
  if (path.endsWith('/studies')) return ' — Case studies'
  if (path.endsWith('/funding')) return ' — Funding'
  if (path.endsWith('/tree')) return ' — Tree'
  if (path.endsWith('/history')) return ' — History'
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
    <div class="flex justify-between gap-4 mb-4 flex-col-reverse sm:flex-row sm:items-start">
      <div class="min-w-0 flex flex-col-reverse">
        <h1 :class="underlinedTitle">
          {{ issue.title }}
        </h1>
        <p class="text-5xl text-black/10 font-mono -mt-5">
          #{{ issue.id.toString().padStart(5, '0') }}
        </p>
      </div>
      <UButton
        class="shrink-0 self-end sm:self-start text-gray-500 hover:text-gray-900"
        color="neutral"
        size="sm"
        variant="ghost"
        :icon="canApply ? 'lucide:pencil' : 'lucide:message-square-plus'"
        @click="openEdit"
      >
        {{ editLabel }}
      </UButton>
    </div>
    <UiMarkdown class="text-toned text-lg my-8" :value="issue.summary" />
    <NuxtLink
      v-if="canApply && pendingCount > 0 && !onHistoryTab"
      class="mb-4 flex items-center gap-3 rounded-2xl bg-yellow-50 px-4 py-3 text-sm text-yellow-800 transition-colors hover:bg-yellow-100"
      :to="`/issue/${issueId}/history`"
      @click="track('Pending proposals banner click', { count: pendingCount })"
    >
      <UIcon class="size-4 shrink-0" name="lucide:git-pull-request-arrow" />
      <span class="flex-1">
        {{ pendingCount }} suggested {{ pendingCount === 1 ? 'edit is' : 'edits are' }} awaiting your review.
      </span>
      <span class="inline-flex items-center gap-1 font-medium">
        Review
        <UIcon class="size-3.5" name="lucide:arrow-right" />
      </span>
    </NuxtLink>
    <UiNavTabs :tabs="tabs" />
    <RevisionEditModal
      v-model:open="editOpen"
      :can-apply="canApply"
      :issue="issue"
      :kind="editKind"
      @submitted="onEdited"
    />
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
