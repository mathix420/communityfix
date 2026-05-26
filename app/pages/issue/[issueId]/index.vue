<script setup lang="ts">
const { track } = useUmami()
const route = useRoute()
const issueId = route.params.issueId as string
const toast = useToast()

const { data: issue, refresh } = await useFetch(`/api/issue/${issueId}`)

const { data: parentIssue } = await useFetch(
  () => `/api/issue/${issue.value?.parentId}`,
  { immediate: !!issue.value?.parentId, watch: false },
)

const mapExpanded = ref(false)
const mapVisible = ref(false)
const locationMapRef = ref<{ invalidateSize: () => void }>()
const hasCoords = computed(() => !!issue.value?.location)

function toggleMap() {
  mapExpanded.value = !mapExpanded.value
  if (mapExpanded.value && !mapVisible.value) {
    mapVisible.value = true
  }
}

function onMapTransitionEnd(e: TransitionEvent) {
  if (e.propertyName === 'height' && mapExpanded.value) {
    locationMapRef.value?.invalidateSize()
  }
}

const isSolution = computed(() => issue.value?.type === 'solution')

// Preview lists for the Overview tab. Each tab still owns full rendering;
// these are just teaser slices so users can see what's there without clicking.
const PREVIEW_LIMIT = 3

const { data: subIssuesPreview } = await useFetch(
  () => `/api/issue/${issueId}/issues`,
  { query: { sort: 'most_voted' }, default: () => [] },
)
const { data: solutionsPreview } = await useFetch(
  () => `/api/issue/${issueId}/solutions`,
  { query: { sort: 'most_voted' }, default: () => [], immediate: !isSolution.value },
)
const { data: caseStudiesPreview } = await useFetch(
  () => `/api/issue/${issueId}/case-studies`,
  { default: () => [], immediate: isSolution.value },
)

const topSubIssues = computed(() => (subIssuesPreview.value ?? []).slice(0, PREVIEW_LIMIT))
const topSolutions = computed(() => (solutionsPreview.value ?? []).slice(0, PREVIEW_LIMIT))
const topCaseStudies = computed(() => (caseStudiesPreview.value ?? []).slice(0, PREVIEW_LIMIT))

const subIssueTotal = computed(() => subIssuesPreview.value?.length ?? 0)
const solutionTotal = computed(() => solutionsPreview.value?.length ?? 0)
const caseStudyTotal = computed(() => caseStudiesPreview.value?.length ?? 0)

function outcomeLabel(o: string) {
  return { success: 'Success', partial: 'Partial', failed: 'Failed', inconclusive: 'Inconclusive', ongoing: 'Ongoing' }[o] ?? o
}
function outcomeVariant(o: string): 'success' | 'default' | 'error' | 'warning' {
  return ({ success: 'success', partial: 'default', failed: 'error', inconclusive: 'default', ongoing: 'warning' } as const)[o as 'success'] ?? 'default'
}

const infoResponseText = ref('')
const infoSubmitting = ref(false)

async function submitInfoResponse() {
  infoSubmitting.value = true
  try {
    await $fetch(`/api/issue/${issueId}/respond-info`, {
      method: 'POST' as const,
      body: { response: infoResponseText.value },
    })
    track('Info response submitted', { issueId: Number(issueId) })
    toast.add({ title: 'Response sent', description: 'Your issue will be re-reviewed with the additional context.', color: 'success' })
    await refresh()
  }
  catch (error: any) {
    toast.add({
      title: 'Failed to send response',
      description: error?.data?.message || error?.message || 'Please try again.',
      color: 'error',
    })
  }
  finally {
    infoSubmitting.value = false
  }
}

const appealReason = ref('')
const appealSubmitting = ref(false)

async function submitAppeal() {
  appealSubmitting.value = true
  try {
    await $fetch(`/api/issue/${issueId}/appeal`, {
      method: 'POST',
      body: { reason: appealReason.value },
    })
    umami.track('Issue appeal submitted', { issueId: Number(issueId) })
    toast.add({ title: 'Appeal submitted', description: 'Your appeal is under review.', color: 'success' })
    await refresh()
  }
  catch (error: any) {
    toast.add({
      title: 'Failed to submit appeal',
      description: error?.data?.message || error?.message || 'Please try again.',
      color: 'error',
    })
  }
  finally {
    appealSubmitting.value = false
  }
}
</script>

<template>
  <div
    v-if="issue"
    class="mt-3 space-y-3"
  >
    <IssueParentCallout
      v-if="parentIssue"
      :parent="{ id: parentIssue.id, title: parentIssue.title }"
      @click="track('Parent issue click', { from: Number(issueId), to: parentIssue.id })"
    />

    <div
      v-if="issue.status === 'pending' && !issue.infoRequest"
      class="bg-yellow-50 text-yellow-700 rounded-2xl p-4 sm:p-6 text-sm font-mono text-center"
    >
      This issue is pending review and has not been published yet.
    </div>

    <div
      v-if="issue.status === 'pending' && issue.infoRequest && !issue.infoResponse"
      class="bg-blue-50 rounded-2xl px-4 py-4 sm:px-6 space-y-3"
    >
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-message-circle-question" class="size-5 text-blue-600" />
        <p class="text-blue-800 text-sm font-semibold">Additional information needed</p>
      </div>
      <p class="text-blue-700 text-sm">{{ issue.infoRequest }}</p>
      <form class="flex flex-col gap-2" @submit.prevent="submitInfoResponse">
        <UTextarea
          v-model="infoResponseText"
          placeholder="Provide the requested information..."
          :rows="3"
          class="w-full"
        />
        <UButton
          type="submit"
          color="primary"
          size="sm"
          :loading="infoSubmitting"
          :disabled="!infoResponseText.trim()"
        >
          Send Response
        </UButton>
      </form>
    </div>

    <div
      v-if="issue.status === 'pending' && issue.infoRequest && issue.infoResponse"
      class="bg-green-50 rounded-2xl px-4 py-4 sm:px-6 space-y-2"
    >
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-check-circle" class="size-5 text-green-600" />
        <p class="text-green-800 text-sm font-semibold">Response sent — re-review in progress</p>
      </div>
      <p class="text-green-700 text-xs">Question: {{ issue.infoRequest }}</p>
      <p class="text-green-700 text-sm">Your response: {{ issue.infoResponse }}</p>
    </div>

    <div
      v-if="issue.status === 'rejected'"
      class="bg-red-50 rounded-2xl px-4 py-4 space-y-3"
    >
      <p class="text-red-700 text-sm font-semibold">
        This issue was rejected by moderation.
      </p>
      <p class="text-red-600 text-sm">
        Reason: {{ issue.rejectionReason }}
      </p>

      <p
        v-if="issue.appealStatus === 'pending'"
        class="text-yellow-700 text-sm font-mono"
      >
        Your appeal is under review.
      </p>
      <p
        v-else-if="issue.appealStatus === 'denied'"
        class="text-red-700 text-sm font-mono"
      >
        Your appeal was denied.
      </p>

      <div v-else-if="!issue.appealStatus && !issue.isSpam">
        <form
          class="flex flex-col gap-2"
          @submit.prevent="submitAppeal"
        >
          <UTextarea
            v-model="appealReason"
            placeholder="Explain why this issue should be reconsidered..."
            :rows="3"
            class="w-full"
          />
          <UButton
            type="submit"
            color="primary"
            size="sm"
            :loading="appealSubmitting"
            :disabled="!appealReason.trim()"
            data-umami-event="Appeal rejected issue"
          >
            Appeal this decision
          </UButton>
        </form>
      </div>
    </div>

    <div class="space-y-3">
      <div
        v-if="issue.tags?.length || issue.sustainableDevelopmentGoals?.length"
        class="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        <div
          v-if="issue.tags?.length"
          class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6"
        >
          <div class="flex items-center gap-2 mb-2.5">
            <UIcon name="lucide:tags" class="size-4 text-gray-400" />
            <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
              Tags
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <NuxtLink
              v-for="tag in issue.tags"
              :key="tag"
              :to="`/tag/${tag}`"
              @click="track('Issue tag click', { tag })"
            >
              <UiTag rounded="md">{{ tag }}</UiTag>
            </NuxtLink>
          </div>
        </div>

        <div
          v-if="issue.sustainableDevelopmentGoals?.length"
          class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6"
        >
          <div class="flex items-center gap-2 mb-2.5">
            <UIcon name="lucide:globe" class="size-4 text-gray-400" />
            <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
              Sustainable Development Goals
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <NuxtLink
              v-for="goal in issue.sustainableDevelopmentGoals"
              :key="goal.id"
              :href="goal.link"
              target="_blank"
              @click="track('SDG link click', { goal: goal.name })"
            >
              <img
                :src="goal.iconUrl"
                :alt="goal.name"
                :title="goal.name"
                class="size-16"
              >
            </NuxtLink>
          </div>
        </div>
      </div>

      <div
        v-if="issue.locationName || issue.scale"
        class="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden"
      >
        <component
          :is="hasCoords ? 'button' : 'div'"
          class="w-full flex items-center gap-3 p-4 sm:p-6 text-left transition-colors"
          :class="[hasCoords && 'hover:bg-gray-100 cursor-pointer', mapExpanded && 'border-b border-gray-200']"
          @click="hasCoords && toggleMap()"
        >
          <UIcon name="lucide:map-pin" class="size-4 shrink-0 text-gray-400" />
          <div class="flex-1 min-w-0">
            <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
              Location
            </p>
            <div class="flex items-center gap-2 flex-wrap mt-1">
              <span v-if="issue.locationName" class="text-sm font-medium text-gray-700">
                {{ issue.locationName }}
              </span>
              <UiTag v-if="issue.scale" rounded="md" size="sm" variant="neutral" :interactive="false">
                {{ issue.scale }}
              </UiTag>
              <span
                v-if="issue.location"
                class="text-xs text-gray-400 font-mono"
              >
                {{ issue.location.latitude.toFixed(4) }}, {{ issue.location.longitude.toFixed(4) }}
              </span>
            </div>
          </div>
          <UIcon
            v-if="issue.location"
            name="lucide:chevron-down"
            class="size-4 shrink-0 text-gray-400 transition-transform duration-200"
            :class="{ 'rotate-180': mapExpanded }"
          />
        </component>
        <div
          class="map-reveal"
          :class="mapExpanded ? 'map-reveal--open' : ''"
          @transitionend="onMapTransitionEnd"
        >
          <LocationMap
            v-if="mapVisible && issue.location"
            ref="locationMapRef"
            :latitude="issue.location.latitude"
            :longitude="issue.location.longitude"
            :scale="issue.scale"
          />
        </div>
      </div>

      <div
        v-if="issue.description"
        class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6"
      >
        <div class="flex items-center gap-2 mb-2.5">
          <UIcon name="lucide:file-text" class="size-4 text-gray-400" />
          <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
            Description
          </p>
        </div>
        <UiMarkdown
          :value="issue.description"
          class="prose-sm text-gray-700"
        />
      </div>

      <div
        v-if="isSolution && issue.links?.length"
        class="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden"
      >
        <div class="flex items-center gap-2 p-4 sm:p-6 border-b border-gray-200">
          <UIcon name="lucide:paperclip" class="size-4 text-gray-400" />
          <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
            Links
          </p>
          <span class="text-xs font-mono text-gray-400">{{ issue.links.length }}</span>
        </div>
        <ul class="divide-y divide-gray-200 bg-white">
          <li v-for="(l, i) in issue.links" :key="i">
            <a
              :href="l.url"
              target="_blank"
              rel="nofollow noopener noreferrer"
              class="flex items-center gap-3 px-4 py-2.5 sm:px-6 hover:bg-gray-50 transition-colors min-w-0"
              @click="track('Solution link click', { issueId: Number(issueId) })"
            >
              <UIcon name="lucide:external-link" class="size-3.5 text-gray-400 shrink-0" />
              <span class="truncate text-sm text-primary-700">
                {{ l.title || l.url }}
              </span>
            </a>
          </li>
        </ul>
      </div>

      <!-- Sub-issues preview -->
      <section class="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden">
        <div class="flex items-center justify-between gap-2 p-4 sm:p-6 border-b border-gray-200">
          <div class="flex items-center gap-2 min-w-0">
            <UIcon name="lucide:circle-alert" class="size-4 text-gray-400" />
            <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
              Sub-issues
            </p>
            <span class="text-xs font-mono text-gray-400">{{ subIssueTotal }}</span>
          </div>
          <NuxtLink
            :to="`/issue/${issueId}/issues`"
            class="text-xs font-mono text-primary-700 hover:text-primary-900 inline-flex items-center gap-1"
            @click="track('Overview preview view all', { tab: 'issues' })"
          >
            View all
            <UIcon name="lucide:arrow-right" class="size-3" />
          </NuxtLink>
        </div>
        <ul v-if="topSubIssues.length" class="divide-y divide-gray-200 bg-white">
          <li v-for="it in topSubIssues" :key="it.id">
            <NuxtLink
              :to="`/issue/${it.id}`"
              class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors min-w-0"
            >
              <UIcon name="lucide:circle-alert" class="size-3.5 text-gray-400 shrink-0" />
              <span class="text-gray-400 font-mono text-xs shrink-0">{{ formatNumber(it.id) }}</span>
              <span class="truncate text-sm text-gray-800 flex-1">{{ it.title }}</span>
              <span class="text-xs font-mono text-gray-500 inline-flex items-center gap-1 shrink-0">
                <UIcon name="lucide:arrow-up" class="size-3" />
                {{ it.voteScore ?? 0 }}
              </span>
            </NuxtLink>
          </li>
        </ul>
        <div v-else class="bg-white p-4 sm:p-6 text-sm text-gray-500">
          No sub-issues yet.
          <NuxtLink
            :to="`/new?parent=${issueId}&type=issue`"
            class="text-primary-700 hover:text-primary-900 underline underline-offset-2"
            @click="track('Overview preview empty cta', { tab: 'issues' })"
          >
            Add the first one →
          </NuxtLink>
        </div>
      </section>

      <!-- Solutions preview (issue pages only) -->
      <section v-if="!isSolution" class="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden">
        <div class="flex items-center justify-between gap-2 p-4 sm:p-6 border-b border-gray-200">
          <div class="flex items-center gap-2 min-w-0">
            <UIcon name="lucide:lightbulb" class="size-4 text-primary-600" />
            <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
              Top solutions
            </p>
            <span class="text-xs font-mono text-gray-400">{{ solutionTotal }}</span>
          </div>
          <NuxtLink
            :to="`/issue/${issueId}/solutions`"
            class="text-xs font-mono text-primary-700 hover:text-primary-900 inline-flex items-center gap-1"
            @click="track('Overview preview view all', { tab: 'solutions' })"
          >
            View all
            <UIcon name="lucide:arrow-right" class="size-3" />
          </NuxtLink>
        </div>
        <ul v-if="topSolutions.length" class="divide-y divide-gray-200 bg-white">
          <li v-for="sol in topSolutions" :key="sol.id">
            <NuxtLink
              :to="`/issue/${sol.id}`"
              class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors min-w-0"
            >
              <UIcon name="lucide:lightbulb" class="size-3.5 text-primary-600 shrink-0" />
              <span class="text-gray-400 font-mono text-xs shrink-0">{{ formatNumber(sol.id) }}</span>
              <span class="truncate text-sm text-gray-800 flex-1">{{ sol.title }}</span>
              <UiBadge v-if="sol.solutionStatus === 'plan'">Plan</UiBadge>
              <UiBadge v-else-if="sol.solutionStatus === 'in-progress'" variant="warning">In progress</UiBadge>
              <UiBadge v-else-if="sol.solutionStatus === 'done'" variant="success">Done</UiBadge>
              <span class="text-xs font-mono text-gray-500 inline-flex items-center gap-1 shrink-0">
                <UIcon name="lucide:arrow-up" class="size-3" />
                {{ sol.voteScore ?? 0 }}
              </span>
            </NuxtLink>
          </li>
        </ul>
        <div v-else class="bg-white p-4 sm:p-6 text-sm text-gray-500">
          No solutions proposed yet.
          <NuxtLink
            :to="`/new?parent=${issueId}&type=solution`"
            class="text-primary-700 hover:text-primary-900 underline underline-offset-2"
            @click="track('Overview preview empty cta', { tab: 'solutions' })"
          >
            Propose the first one →
          </NuxtLink>
        </div>
      </section>

      <!-- Case studies preview (solution pages only) -->
      <section v-if="isSolution" class="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden">
        <div class="flex items-center justify-between gap-2 p-4 sm:p-6 border-b border-gray-200">
          <div class="flex items-center gap-2 min-w-0">
            <UIcon name="lucide:map-pin" class="size-4 text-gray-400" />
            <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
              Case studies
            </p>
            <span class="text-xs font-mono text-gray-400">{{ caseStudyTotal }}</span>
          </div>
          <NuxtLink
            :to="`/issue/${issueId}/studies`"
            class="text-xs font-mono text-primary-700 hover:text-primary-900 inline-flex items-center gap-1"
            @click="track('Overview preview view all', { tab: 'studies' })"
          >
            View all
            <UIcon name="lucide:arrow-right" class="size-3" />
          </NuxtLink>
        </div>
        <ul v-if="topCaseStudies.length" class="divide-y divide-gray-200 bg-white">
          <li v-for="cs in topCaseStudies" :key="cs.id">
            <NuxtLink
              :to="`/issue/${issueId}/studies`"
              class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors min-w-0"
            >
              <UIcon name="lucide:map-pin" class="size-3.5 text-gray-400 shrink-0" />
              <span class="truncate text-sm text-gray-800 flex-1">
                {{ cs.locationName }}
                <span v-if="cs.implementer" class="text-gray-500"> · {{ cs.implementer }}</span>
              </span>
              <UiBadge v-if="cs.verified" variant="success">Verified</UiBadge>
              <UiBadge :variant="outcomeVariant(cs.outcome)">{{ outcomeLabel(cs.outcome) }}</UiBadge>
            </NuxtLink>
          </li>
        </ul>
        <div v-else class="bg-white p-4 sm:p-6 text-sm text-gray-500">
          No case studies documented yet.
          <NuxtLink
            :to="`/issue/${issueId}/studies`"
            class="text-primary-700 hover:text-primary-900 underline underline-offset-2"
          >
            Document the first one →
          </NuxtLink>
        </div>
      </section>

      <!-- Funding + Tree quick links -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <NuxtLink
          :to="`/issue/${issueId}/funding`"
          class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6 hover:bg-gray-100 transition-colors flex items-center gap-3"
          @click="track('Overview preview view all', { tab: 'funding' })"
        >
          <UIcon name="lucide:wallet" class="size-4 text-gray-400 shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-xs font-mono uppercase tracking-wide text-gray-400">Funding</p>
            <p class="text-sm text-gray-700 truncate">Coming soon — back this work</p>
          </div>
          <UIcon name="lucide:arrow-right" class="size-3.5 text-gray-400 shrink-0" />
        </NuxtLink>
        <NuxtLink
          :to="`/issue/${issueId}/tree`"
          class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6 hover:bg-gray-100 transition-colors flex items-center gap-3"
          @click="track('Overview preview view all', { tab: 'tree' })"
        >
          <UIcon name="lucide:git-fork" class="size-4 text-gray-400 shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-xs font-mono uppercase tracking-wide text-gray-400">Tree view</p>
            <p class="text-sm text-gray-700 truncate">Browse the full descendant tree</p>
          </div>
          <UIcon name="lucide:arrow-right" class="size-3.5 text-gray-400 shrink-0" />
        </NuxtLink>
      </div>
    </div>
  </div>
  <div
    v-else
    class="mt-3 bg-white rounded-2xl p-6 text-center"
  >
    <p class="text-gray-500">
      Loading issue details...
    </p>
  </div>
</template>

<style scoped>
.map-reveal {
  height: 0;
  opacity: 0;
  transition: height 0.3s ease, opacity 0.25s ease 0.05s;
}

.map-reveal--open {
  height: 240px;
  opacity: 1;
}
</style>
