<script setup lang="ts">
import type { SerializedRevision } from '../../../server/utils/revision-write'

const route = useRoute()
const id = computed(() => route.params.id as string)

const { data: study, refresh: refreshStudy } = await useFetch(() => `/api/case-study/${id.value}`)

const { data: parent } = await useFetch(
  () => `/api/issue/${study.value?.solutionId}`,
  { immediate: !!study.value?.solutionId, watch: false },
)

const outcomeVariant: Record<string, 'success' | 'default' | 'error' | 'warning'> = {
  success: 'success',
  partial: 'default',
  failed: 'error',
  inconclusive: 'default',
  ongoing: 'warning',
}
const outcomeLabel: Record<string, string> = {
  success: 'Success',
  partial: 'Partial',
  failed: 'Failed',
  inconclusive: 'Inconclusive',
  ongoing: 'Ongoing',
}
// OG image eyebrow: outcome phrased as a "fix" verb.
const ogOutcomeLabel: Record<string, string> = {
  success: 'Fixed',
  partial: 'Partially fixed',
  failed: 'Failed to fix',
  inconclusive: 'Inconclusive',
  ongoing: 'Fixing',
}
const scaleLabel: Record<string, string> = {
  neighborhood: 'Neighborhood',
  city: 'City',
  region: 'Region',
  national: 'National',
  global: 'Global',
}

function formatDay(s?: string | null): string | null {
  if (!s) return null
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const dateRange = computed(() => {
  const start = formatDay(study.value?.startDate)
  const end = formatDay(study.value?.endDate)
  if (!start && !end) return null
  if (start && end) return start === end ? start : `${start} – ${end}`
  if (start) return `Since ${start}`
  return `Until ${end}`
})

const costDisplay = computed(() => {
  const cost = study.value?.cost
  if (cost == null) return null
  const num = Number(cost)
  if (!Number.isFinite(num)) return String(cost)
  const currency = study.value?.currency?.trim()
  if (currency && /^[A-Za-z]{3}$/.test(currency)) {
    try {
      return new Intl.NumberFormat('en', {
        style: 'currency',
        currency: currency.toUpperCase(),
        maximumFractionDigits: 0,
      }).format(num)
    }
    catch { /* fall through */ }
  }
  const formatted = new Intl.NumberFormat('en').format(num)
  return currency ? `${formatted} ${currency}` : formatted
})

const mapVisible = ref(false)
onMounted(() => {
  mapVisible.value = true
})

// Edit / Suggest-edit + collaborative-revision history. Owner/admin edit
// directly; other logged-in users propose a change; logged-out users go to
// /login. Approved revisions are public history; pending/rejected ones are only
// returned to owner/admin/proposer (the endpoint filters).
const { track } = useUmami()
const { user, loggedIn } = useUserSession()
const { isAdmin } = usePendingRevisions()

// Ownership is resolved server-side from node_members and returned on the study.
const isOwner = computed(() => !!study.value?.viewerIsOwner)
const canApply = computed(() => isOwner.value || isAdmin.value)
const editLabel = computed(() => (canApply.value ? 'Edit' : 'Propose changes'))

const editOpen = ref(false)
function openEdit() {
  if (!loggedIn.value) {
    navigateTo('/login')
    return
  }
  track('Open edit modal', { kind: 'case_study', mode: canApply.value ? 'edit' : 'suggest' })
  editOpen.value = true
}

const { data: revisions, refresh: refreshRevisions } = await useFetch<SerializedRevision[]>(
  () => `/api/case-study/${id.value}/revisions`,
  { default: () => [] },
)
const pendingCount = computed(() =>
  canApply.value ? (revisions.value ?? []).filter(r => r.status === 'pending').length : 0,
)

async function onEdited() {
  await Promise.all([refreshStudy(), refreshRevisions()])
}

const historyRef = ref<HTMLElement | null>(null)
function scrollToHistory() {
  track('Pending proposals banner click', { count: pendingCount.value })
  historyRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

if (study.value) {
  const s = study.value
  // OG headline stays the bare location; document <title> is descriptive and
  // suffix-free (global titleTemplate adds the brand suffix).
  const ogHeadline = s.locationName
  const pageTitle = s.solutionTitle
    ? `${s.solutionTitle} — ${s.locationName}`
    : `Case study — ${s.locationName}`
  const description = s.description?.slice(0, 200)
    || `Real-world implementation in ${s.locationName}.`
  const studyUrl = `${SITE_URL}/case-study/${s.id}`

  useSeoMeta({
    title: pageTitle,
    description,
    ogTitle: pageTitle,
    ogDescription: description,
    ogType: 'article',
  })

  const crumbs: { name: string, url: string }[] = [{ name: 'Home', url: SITE_URL }]
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
      ...(s.location
        ? { latitude: s.location.latitude, longitude: s.location.longitude }
        : {}),
      startDate: s.startDate ?? undefined,
      endDate: s.endDate ?? undefined,
      implementer: s.implementer ?? undefined,
      sources: s.sources?.map(src => src.url).filter(Boolean) ?? undefined,
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
      <IssueParentCallout
        v-if="parent"
        :parent="{ id: parent.id, title: parent.title }"
        label="Case study of"
        class="mb-6"
      />

      <header class="flex sm:items-center justify-between mb-4 sm:flex-row flex-col-reverse gap-2">
        <div class="flex items-center gap-3 min-w-0">
          <UIcon name="lucide:map-pin" class="size-7 sm:size-8 shrink-0 text-gray-400" />
          <h1 :class="underlinedTitle" class="truncate">
            {{ study.locationName }}
          </h1>
        </div>
        <div class="flex items-center justify-between gap-3 shrink-0">
          <p class="text-5xl text-black/10 font-mono sm:mt-0 -mt-5">
            #{{ study.id.toString().padStart(5, '0') }}
          </p>
          <UButton
            :icon="canApply ? 'lucide:pencil' : 'lucide:message-square-plus'"
            size="sm"
            color="neutral"
            variant="ghost"
            class="sm:hidden text-gray-500 hover:text-gray-900"
            @click="openEdit"
          >
            {{ editLabel }}
          </UButton>
        </div>
      </header>

      <UButton
        :icon="canApply ? 'lucide:pencil' : 'lucide:message-square-plus'"
        size="sm"
        color="neutral"
        variant="ghost"
        class="hidden sm:inline-flex mb-4 text-gray-500 hover:text-gray-900"
        @click="openEdit"
      >
        {{ editLabel }}
      </UButton>

      <div class="flex items-center gap-2 flex-wrap mb-8">
        <UiBadge :variant="outcomeVariant[study.outcome] ?? 'default'">
          {{ outcomeLabel[study.outcome] ?? study.outcome }}
        </UiBadge>
        <UiBadge
          v-if="study.verified"
          variant="success"
          class="inline-flex items-center gap-1"
        >
          <UIcon name="lucide:badge-check" class="size-3.5" />
          Verified
        </UiBadge>
        <UiBadge v-if="study.scale">
          {{ scaleLabel[study.scale] ?? study.scale }}
        </UiBadge>
      </div>

      <NodeMembers :kind="'case_study'" :node-id="study.id" class="mb-8" />

      <button
        v-if="canApply && pendingCount > 0"
        type="button"
        class="mb-8 flex w-full items-center gap-3 rounded-2xl bg-yellow-50 px-4 py-3 text-sm text-yellow-800 transition-colors hover:bg-yellow-100"
        @click="scrollToHistory"
      >
        <UIcon name="lucide:git-pull-request-arrow" class="size-4 shrink-0" />
        <span class="flex-1 text-left">
          {{ pendingCount }} suggested {{ pendingCount === 1 ? 'edit is' : 'edits are' }} awaiting your review.
        </span>
        <span class="inline-flex items-center gap-1 font-medium">
          Review
          <UIcon name="lucide:arrow-down" class="size-3.5" />
        </span>
      </button>

      <div class="space-y-3">
        <div
          v-if="study.implementer || dateRange"
          class="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <div
            v-if="study.implementer"
            class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6"
          >
            <div class="flex items-center gap-2 mb-2.5">
              <UIcon name="lucide:users" class="size-4 text-gray-400" />
              <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
                Implementer
              </p>
            </div>
            <p class="text-sm text-gray-700">
              {{ study.implementer }}
            </p>
          </div>

          <div
            v-if="dateRange"
            class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6"
          >
            <div class="flex items-center gap-2 mb-2.5">
              <UIcon name="lucide:calendar" class="size-4 text-gray-400" />
              <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
                Timeline
              </p>
            </div>
            <p class="text-sm text-gray-700">
              {{ dateRange }}
            </p>
          </div>
        </div>

        <div
          v-if="study.location"
          class="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden"
        >
          <div class="flex items-center gap-3 p-4 sm:p-6 border-b border-gray-200">
            <UIcon name="lucide:map" class="size-4 shrink-0 text-gray-400" />
            <div class="flex-1 min-w-0">
              <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
                Location
              </p>
              <div class="flex items-center gap-2 flex-wrap mt-1">
                <span class="text-sm font-medium text-gray-700">
                  {{ study.locationName }}
                </span>
                <span class="text-xs text-gray-400 font-mono">
                  {{ study.location.latitude.toFixed(4) }}, {{ study.location.longitude.toFixed(4) }}
                </span>
              </div>
            </div>
          </div>
          <div class="h-[300px]">
            <LocationMap
              v-if="mapVisible"
              :latitude="study.location.latitude"
              :longitude="study.location.longitude"
              :scale="study.scale"
              :area="study.location.area"
            />
          </div>
        </div>

        <div
          v-if="study.description"
          class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6"
        >
          <div class="flex items-center gap-2 mb-2.5">
            <UIcon name="lucide:file-text" class="size-4 text-gray-400" />
            <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
              Description
            </p>
          </div>
          <UiMarkdown
            :value="study.description"
            class="prose-sm text-gray-700"
          />
        </div>

        <div
          v-if="study.metrics?.length"
          class="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden"
        >
          <div class="flex items-center gap-2 p-4 sm:p-6 border-b border-gray-200">
            <UIcon name="lucide:line-chart" class="size-4 text-gray-400" />
            <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
              Metrics
            </p>
            <span class="text-xs font-mono text-gray-400">{{ study.metrics.length }}</span>
          </div>
          <div class="divide-y divide-gray-200 bg-white text-sm">
            <div
              v-for="(m, i) in study.metrics"
              :key="i"
              class="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-baseline px-4 py-3 sm:px-6"
            >
              <span class="truncate text-gray-700">{{ m.label }}</span>
              <span class="font-mono text-xs whitespace-nowrap">
                <template v-if="m.baseline">
                  <span class="text-gray-400">{{ m.baseline }}</span>
                  <UIcon name="lucide:arrow-right" class="size-3 -mt-0.5 mx-1 text-gray-400" />
                </template>
                <span v-if="m.result" class="text-gray-900 font-semibold">{{ m.result }}</span>
                <span v-if="m.unit" class="text-gray-500 ml-1">{{ m.unit }}</span>
              </span>
            </div>
          </div>
        </div>

        <div
          v-if="costDisplay || study.fundingSource"
          class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6"
        >
          <div class="flex items-center gap-2 mb-2.5">
            <UIcon name="lucide:wallet" class="size-4 text-gray-400" />
            <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
              Funding
            </p>
          </div>
          <div class="flex items-center gap-x-3 gap-y-1 flex-wrap text-sm text-gray-700">
            <span v-if="costDisplay" class="font-mono">{{ costDisplay }}</span>
            <span v-if="costDisplay && study.fundingSource" class="text-gray-300">·</span>
            <span v-if="study.fundingSource">{{ study.fundingSource }}</span>
          </div>
        </div>

        <div
          v-if="study.lessonsLearned?.length"
          class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6"
        >
          <div class="flex items-center gap-2 mb-2.5">
            <UIcon name="lucide:lightbulb" class="size-4 text-gray-400" />
            <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
              Lessons learned
            </p>
          </div>
          <ul class="list-disc list-outside pl-5 space-y-1.5 text-sm text-gray-700">
            <li v-for="(l, i) in study.lessonsLearned" :key="i">
              {{ l }}
            </li>
          </ul>
        </div>

        <div
          v-if="study.sources?.length"
          class="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden"
        >
          <div class="flex items-center gap-2 p-4 sm:p-6 border-b border-gray-200">
            <UIcon name="lucide:book-open" class="size-4 text-gray-400" />
            <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
              Sources
            </p>
            <span class="text-xs font-mono text-gray-400">{{ study.sources.length }}</span>
          </div>
          <ul class="divide-y divide-gray-200 bg-white">
            <li v-for="(s, i) in study.sources" :key="i">
              <a
                :href="s.url"
                target="_blank"
                rel="nofollow noopener noreferrer"
                class="flex items-center gap-3 px-4 py-2.5 sm:px-6 hover:bg-gray-50 transition-colors min-w-0"
              >
                <UIcon name="lucide:external-link" class="size-3.5 text-gray-400 shrink-0" />
                <span class="truncate text-sm text-primary-700">
                  {{ s.title || s.url }}
                </span>
              </a>
            </li>
          </ul>
        </div>

        <div
          v-if="study.links?.length"
          class="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden"
        >
          <div class="flex items-center gap-2 p-4 sm:p-6 border-b border-gray-200">
            <UIcon name="lucide:paperclip" class="size-4 text-gray-400" />
            <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
              Links
            </p>
            <span class="text-xs font-mono text-gray-400">{{ study.links.length }}</span>
          </div>
          <ul class="divide-y divide-gray-200 bg-white">
            <li v-for="(l, i) in study.links" :key="i">
              <a
                :href="l.url"
                target="_blank"
                rel="nofollow noopener noreferrer"
                class="flex items-center gap-3 px-4 py-2.5 sm:px-6 hover:bg-gray-50 transition-colors min-w-0"
              >
                <UIcon name="lucide:external-link" class="size-3.5 text-gray-400 shrink-0" />
                <span class="truncate text-sm text-primary-700">
                  {{ l.title || l.url }}
                </span>
              </a>
            </li>
          </ul>
        </div>

        <div
          class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6 flex items-center justify-between gap-3 flex-wrap"
        >
          <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
            Documented {{ new Date(study.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }}
          </p>
          <UserButton :author-id="study.authorId" :name="study.author" />
        </div>
      </div>

      <section ref="historyRef" class="mt-12 scroll-mt-6">
        <div class="mb-4 flex items-baseline gap-3">
          <UiSectionTitle>History</UiSectionTitle>
          <span v-if="revisions?.length" class="font-mono text-[10px] text-gray-400 tracking-widest">
            · {{ revisions.length }}
          </span>
        </div>
        <RevisionTimeline
          :revisions="revisions ?? []"
          :can-decide="canApply"
          :viewer-id="loggedIn ? user?.id : null"
          @changed="onEdited"
        />
      </section>

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
