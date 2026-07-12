<script setup lang="ts">
import type { SerializedRevision } from '../../../server/utils/revision-write'

const route = useRoute()
const id = computed(() => route.params.id as string)

const { data: study, refresh: refreshStudy } = await useFetch(() => `/api/case-study/${id.value}`)

const { data: parent } = await useFetch(() => `/api/issue/${study.value?.solutionId}`, {
  immediate: !!study.value?.solutionId,
  watch: false,
})

// OG image eyebrow: outcome phrased as a "fix" verb (unique to this page; the
// on-page badge labels/variants come from the shared case-study helpers).
const ogOutcomeLabel: Record<string, string> = {
  success: 'Fixed',
  partial: 'Partially fixed',
  failed: 'Failed to fix',
  inconclusive: 'Inconclusive',
  ongoing: 'Fixing',
}

// Make the loaded row available to nested route children (index renders the
// cards, contributors/history are quiet meta pages reached from the Overview).
provide('caseStudy', study)
provide('caseStudyParent', parent)

// Edit / Suggest-edit + collaborative-revision history. Owner/admin edit
// directly; other logged-in users propose a change; logged-out users go to
// /login. Approved revisions are public history; pending/rejected ones are only
// returned to owner/admin/proposer (the endpoint filters).
const { track } = useUmami()
const { loggedIn } = useUserSession()
const { isAdmin } = usePendingRevisions()

// Ownership is resolved server-side from node_members and returned on the study.
const isOwner = computed(() => !!study.value?.viewerIsOwner)
const canApply = computed(() => isOwner.value || isAdmin.value)
const editLabel = computed(() => (canApply.value ? 'Edit' : 'Propose changes'))
provide('caseStudyCanApply', canApply)

const editOpen = ref(false)
function openEdit() {
  if (!loggedIn.value) {
    navigateTo('/login')
    return
  }
  track('Open edit modal', { kind: 'case_study', mode: canApply.value ? 'edit' : 'suggest' })
  editOpen.value = true
}

// Cheap pending-proposal count for the owner/admin banner. Only fetched for
// people who could act on it; the History page loads the full timeline itself.
const { data: revisionRows, refresh: refreshPendingCount } = await useFetch<SerializedRevision[]>(
  () => `/api/case-study/${id.value}/revisions`,
  { key: 'case-study-pending-banner', default: () => [], immediate: false },
)
watchEffect(() => {
  if (canApply.value && study.value) refreshPendingCount()
})
const pendingCount = computed(() =>
  canApply.value ? (revisionRows.value ?? []).filter((r) => r.status === 'pending').length : 0,
)
const onHistoryTab = computed(() => route.path.endsWith('/history'))

async function onEdited() {
  await Promise.all([refreshStudy(), refreshPendingCount()])
}
provide('caseStudyRefresh', onEdited)

if (study.value) {
  const s = study.value
  // OG headline stays the bare location; document <title> is descriptive and
  // suffix-free (global titleTemplate adds the brand suffix).
  const ogHeadline = s.locationName
  const pageTitle = s.solutionTitle
    ? `${s.solutionTitle} — ${s.locationName}`
    : `Case study — ${s.locationName}`
  const description =
    s.description?.slice(0, 200) || `Real-world implementation in ${s.locationName}.`
  const studyUrl = `${SITE_URL}/case-study/${s.id}`

  useSeoMeta({
    title: pageTitle,
    description,
    ogTitle: pageTitle,
    ogDescription: description,
    ogType: 'article',
  })

  const crumbs: { name: string; url: string }[] = [{ name: 'Home', url: SITE_URL }]
  if (parent.value) {
    crumbs.push({ name: parent.value.title, url: `${SITE_URL}/issue/${parent.value.id}` })
  }
  crumbs.push({ name: pageTitle, url: studyUrl })

  useJsonLd([
    breadcrumbSchema(crumbs),
    creativeWorkSchema({
      title: pageTitle,
      description: s.description ?? undefined,
      url: studyUrl,
      locationName: s.locationName,
      ...(s.location ? { latitude: s.location.latitude, longitude: s.location.longitude } : {}),
      startDate: s.startDate ?? undefined,
      endDate: s.endDate ?? undefined,
      implementer: s.implementer ?? undefined,
      sources: s.sources?.map((src) => src.url).filter(Boolean) ?? undefined,
      datePublished: s.createdAt,
      dateModified: s.updatedAt ?? undefined,
    }),
  ])

  defineOgImage('Community', {
    title: ogHeadline,
    kind: 'Case Study',
    id: s.id,
    // Eyebrow hinting at the parent solution + its outcome. Read off the
    // awaited study payload so it's present when the OG image is captured.
    subtitle: s.solutionTitle ?? undefined,
    subtitleLabel: ogOutcomeLabel[s.outcome] ?? undefined,
    subtitleColor: '3b82f6', // blue for now (6-digit hex, no leading `#`)
  })
}
</script>

<template>
  <AppContainer v-if="study">
    <div class="max-w-3xl mx-auto">
      <div class="flex justify-between gap-4 mb-4 flex-col-reverse sm:flex-row sm:items-start">
        <div class="min-w-0 flex flex-col-reverse">
          <div class="flex items-center gap-3 min-w-0">
            <UIcon class="size-7 sm:size-8 shrink-0 text-gray-400" name="lucide:map-pin" />
            <h1 class="truncate" :class="underlinedTitle">
              {{ study.locationName }}
            </h1>
          </div>
          <p class="text-5xl text-black/10 font-mono -mt-5">
            #{{ study.id.toString().padStart(5, '0') }}
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
      <div class="flex items-center gap-2 flex-wrap mb-6">
        <UiBadge :variant="outcomeBadgeVariant(study.outcome)">
          {{ outcomeBadgeLabel(study.outcome) }}
        </UiBadge>
        <UiBadge v-if="study.verified" class="inline-flex items-center gap-1" variant="success">
          <UIcon class="size-3.5" name="lucide:badge-check" />
          Verified
        </UiBadge>
        <UiBadge v-if="study.scale">
          {{ scaleBadgeLabel(study.scale) }}
        </UiBadge>
      </div>
      <IssueParentCallout
        v-if="parent"
        class="mb-6"
        label="Case study of"
        :parent="{ id: parent.id, title: parent.title }"
      />
      <NuxtLink
        v-if="canApply && pendingCount > 0 && !onHistoryTab"
        class="mb-6 flex items-center gap-3 rounded-2xl bg-yellow-50 px-4 py-3 text-sm text-yellow-800 transition-colors hover:bg-yellow-100"
        :to="`/case-study/${id}/history`"
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
      <NuxtPage />
      <RevisionEditModal
        v-model:open="editOpen"
        kind="case_study"
        :can-apply="canApply"
        :case-study="study"
        @submitted="onEdited"
      />
    </div>
  </AppContainer>
  <AppContainer v-else>
    <div class="flex items-center justify-center h-screen">
      <p class="text-toned text-lg">
        Case study not found.
      </p>
    </div>
  </AppContainer>
</template>
