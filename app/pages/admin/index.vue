<script setup lang="ts">
import { slaTier, ageHours } from '~/utils/admin-sla'

const { data: stats, refresh: refreshStats } = await useFetch('/api/admin/stats')
const { data: queue, refresh: refreshQueue } = await useFetch('/api/admin/queue')
const { data: health } = await useFetch('/api/admin/ai-health', { query: { days: 30 } })

const { run, isPending } = useAdminAction()
async function refreshAll() {
  await Promise.all([refreshQueue(), refreshStats()])
}

// --- Reject modal wiring ---
const rejectOpen = ref(false)
const rejectTarget = ref<{ kind: 'issue' | 'case-study'; id: number; label: string } | null>(null)

function askReject(kind: 'issue' | 'case-study', id: number, label: string) {
  rejectTarget.value = { kind, id, label }
  rejectOpen.value = true
}

async function onReject(reason: string) {
  if (!rejectTarget.value) return
  const t = rejectTarget.value
  const path =
    t.kind === 'case-study'
      ? `/api/admin/case-study/${t.id}/reject`
      : `/api/admin/issues/${t.id}/reject`
  const result = await run(`reject-${t.kind}-${t.id}`, () =>
    $fetch(path, { method: 'POST' as const, body: { reason } }),
  )
  if (result) {
    rejectOpen.value = false
    rejectTarget.value = null
    await refreshAll()
  }
}

// --- Edit-approve modal wiring ---
const editOpen = ref(false)
const editIssue = ref<{
  id: number
  title: string
  summary: string
  description: string | null
  type: 'issue' | 'solution'
} | null>(null)
const editCaseStudy = ref<{
  id: number
  description: string | null
  implementer: string | null
  locationName: string
  outcome: 'success' | 'partial' | 'failed' | 'inconclusive' | 'ongoing'
} | null>(null)
const editKind = ref<'issue' | 'case-study'>('issue')

function openEditIssue(i: {
  id: number
  title: string
  summary: string
  description?: string | null
  type?: 'issue' | 'solution'
}) {
  editKind.value = 'issue'
  editIssue.value = {
    id: i.id,
    title: i.title,
    summary: i.summary,
    description: i.description ?? null,
    type: i.type ?? 'issue',
  }
  editCaseStudy.value = null
  editOpen.value = true
}
function openEditCaseStudy(c: {
  id: number
  description?: string | null
  implementer?: string | null
  locationName: string
  outcome: 'success' | 'partial' | 'failed' | 'inconclusive' | 'ongoing'
}) {
  editKind.value = 'case-study'
  editCaseStudy.value = {
    id: c.id,
    description: c.description ?? null,
    implementer: c.implementer ?? null,
    locationName: c.locationName,
    outcome: c.outcome,
  }
  editIssue.value = null
  editOpen.value = true
}

// --- Request-info modal wiring ---
const requestInfoModalOpen = ref(false)
const requestInfoIssueId = ref(0)
const requestInfoText = ref('')

function openRequestInfo(issueId: number, existingQuestion = '') {
  requestInfoIssueId.value = issueId
  requestInfoText.value = existingQuestion
  requestInfoModalOpen.value = true
}
function closeRequestInfo() {
  requestInfoModalOpen.value = false
  requestInfoText.value = ''
}
async function sendInfoRequest() {
  if (!requestInfoIssueId.value || !requestInfoText.value.trim()) return
  const result = await run(`info-${requestInfoIssueId.value}`, () =>
    $fetch(`/api/admin/issues/${requestInfoIssueId.value}/request-info`, {
      method: 'POST' as const,
      body: { question: requestInfoText.value.trim() },
    }),
  )
  if (result) {
    closeRequestInfo()
    await refreshAll()
  }
}

// --- Direct actions ---
async function forceApprove(id: number) {
  const result = await run(`approve-issue-${id}`, () =>
    $fetch(`/api/admin/issues/${id}/approve`, { method: 'POST' as const, body: {} }),
  )
  if (result) await refreshAll()
}
async function approveCaseStudy(id: number) {
  const result = await run(`approve-cs-${id}`, () =>
    $fetch(`/api/admin/case-study/${id}/approve`, { method: 'POST' as const, body: {} }),
  )
  if (result) await refreshAll()
}
async function triggerRemod(id: number) {
  const result = await run(`remod-${id}`, () =>
    $fetch(`/api/admin/issues/${id}/remod`, { method: 'POST' as const }),
  )
  if (result) await refreshAll()
}
async function triggerCaseStudyRemod(id: number) {
  const result = await run(`remod-cs-${id}`, () =>
    $fetch(`/api/admin/case-study/${id}/remod`, { method: 'POST' as const }),
  )
  if (result) await refreshAll()
}
async function resolveAppeal(id: number, status: 'approved' | 'denied') {
  const result = await run(`appeal-${id}-${status}`, () =>
    $fetch(`/api/admin/issues/${id}/appeal`, { method: 'PATCH' as const, body: { status } }),
  )
  if (result) await refreshAll()
}
async function unbanUser(userId: string) {
  const result = await run(`unban-${userId}`, () =>
    $fetch(`/api/admin/users/${userId}/unban`, { method: 'POST' as const, body: {} }),
  )
  if (result) await refreshAll()
}
async function denyBanAppeal(userId: string) {
  const result = await run(`ban-deny-${userId}`, () =>
    $fetch(`/api/admin/users/${userId}/ban-appeal`, {
      method: 'PATCH' as const,
      body: { status: 'denied' },
    }),
  )
  if (result) await refreshAll()
}

function formatConfidence(c: number | undefined | null) {
  if (c == null) return ''
  return `${Math.round(c * 100)}%`
}

function formatPercent(value: number | null) {
  if (value == null) return '—'
  return `${Math.round(value * 100)}%`
}

const totalActionable = computed(() => {
  if (!queue.value) return 0
  return (
    (queue.value.uncertain?.length ?? 0) +
    (queue.value.pendingAppeals?.length ?? 0) +
    (queue.value.infoReceived?.length ?? 0) +
    (queue.value.pendingCaseStudies?.length ?? 0) +
    (queue.value.banAppeals?.length ?? 0)
  )
})

const oldestTier = computed(() => slaTier(stats.value?.oldestUnresolvedAt ?? null))
const oldestHours = computed(() => ageHours(stats.value?.oldestUnresolvedAt ?? null))
const oldestLabel = computed(() => {
  if (oldestHours.value == null) return null
  return oldestHours.value < 24 ? `${oldestHours.value}h` : `${Math.floor(oldestHours.value / 24)}d`
})

const oldestTone = computed(() => (oldestTier.value === 'overdue' ? 'text-red-600' : 'text-toned'))

// Pull confidence from the audit-log details payload — it's typed as
// unknown in the schema, so we narrow here once instead of casting at
// every reference.
function detailConfidence(details: unknown): number | null {
  if (!details || typeof details !== 'object') return null
  const c = (details as Record<string, unknown>).confidence
  return typeof c === 'number' ? c : null
}
function detailAiDecision(details: unknown): string | null {
  if (!details || typeof details !== 'object') return null
  const d = (details as Record<string, unknown>).aiDecision
  return typeof d === 'string' ? d : null
}
function detailQuestions(details: unknown): string[] {
  if (!details || typeof details !== 'object') return []
  const q = (details as Record<string, unknown>).questions
  return Array.isArray(q) ? q.filter((s): s is string => typeof s === 'string') : []
}
function detailSimilar(details: unknown): Array<{ id: number; similarity: number }> {
  if (!details || typeof details !== 'object') return []
  const s = (details as Record<string, unknown>).similarIssues
  if (!Array.isArray(s)) return []
  return s.filter(
    (row): row is { id: number; similarity: number } =>
      !!row && typeof row === 'object' && typeof (row as { id?: unknown }).id === 'number',
  )
}
</script>

<template>
  <div class="space-y-8">
    <!-- Stats grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <UiCard padding="sm">
        <p class="font-mono text-[11px] text-gray-500 uppercase tracking-widest">
          Action needed
        </p>
        <p class="text-2xl font-mono font-medium mt-1">
          {{ totalActionable }}
        </p>
        <p v-if="oldestLabel" class="text-[10px] mt-0.5" :class="oldestTone">
          oldest {{ oldestLabel }}
        </p>
      </UiCard>
      <UiCard padding="sm">
        <p class="font-mono text-[11px] text-gray-500 uppercase tracking-widest">
          Pending issues
        </p>
        <p class="text-2xl font-mono font-medium mt-1">
          {{ stats?.pendingIssues ?? 0 }}
        </p>
      </UiCard>
      <UiCard padding="sm">
        <p class="font-mono text-[11px] text-gray-500 uppercase tracking-widest">
          Pending case studies
        </p>
        <p class="text-2xl font-mono font-medium mt-1">
          {{ stats?.pendingCaseStudies ?? 0 }}
        </p>
      </UiCard>
      <UiCard padding="sm">
        <p class="font-mono text-[11px] text-gray-500 uppercase tracking-widest">
          Needs review
        </p>
        <p class="text-2xl font-mono font-medium mt-1">
          {{ stats?.pendingReviews ?? 0 }}
        </p>
      </UiCard>
      <UiCard padding="sm">
        <p class="font-mono text-[11px] text-gray-500 uppercase tracking-widest">
          Issue appeals
        </p>
        <p class="text-2xl font-mono font-medium mt-1">
          {{ stats?.issueAppeals ?? 0 }}
        </p>
      </UiCard>
      <UiCard padding="sm">
        <p class="font-mono text-[11px] text-gray-500 uppercase tracking-widest">
          Ban appeals
        </p>
        <p class="text-2xl font-mono font-medium mt-1">
          {{ stats?.banAppeals ?? 0 }}
        </p>
      </UiCard>
    </div>
    <!-- AI moderation health -->
    <section v-if="health">
      <div class="mb-3 flex items-baseline gap-2">
        <h2 class="font-mono text-sm uppercase tracking-widest text-gray-700">
          AI moderation health
        </h2>
        <span class="font-mono text-[10px] text-gray-400 uppercase tracking-widest">
          last {{ health.windowDays }}d
        </span>
      </div>
      <UiCard padding="md">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p class="font-mono text-[11px] text-gray-500 uppercase tracking-widest">
              Decisions
            </p>
            <p class="text-lg font-mono font-medium mt-0.5">
              {{ health.overall.total }}
            </p>
            <p class="text-[11px] text-toned mt-0.5">
              {{ health.overall.autoResolved }} auto · {{ health.overall.needsReview }} flagged
            </p>
          </div>
          <div>
            <p class="font-mono text-[11px] text-gray-500 uppercase tracking-widest">
              Override rate
            </p>
            <p
              class="text-lg font-mono font-medium mt-0.5"
              :class="health.disagreementRate != null && health.disagreementRate > 0.25 ? 'text-red-600' : ''"
            >
              {{ formatPercent(health.disagreementRate) }}
            </p>
            <p class="text-[11px] text-toned mt-0.5">
              when admins reviewed
            </p>
          </div>
          <div>
            <p class="font-mono text-[11px] text-gray-500 uppercase tracking-widest">
              Appeal grant rate
            </p>
            <p
              class="text-lg font-mono font-medium mt-0.5"
              :class="health.appeals.grantRate != null && health.appeals.grantRate > 0.3 ? 'text-red-600' : ''"
            >
              {{ formatPercent(health.appeals.grantRate) }}
            </p>
            <p class="text-[11px] text-toned mt-0.5">
              {{ health.appeals.granted }} / {{ health.appeals.granted + health.appeals.denied }} resolved
            </p>
          </div>
          <div>
            <p class="font-mono text-[11px] text-gray-500 uppercase tracking-widest">
              Avg confidence
            </p>
            <p class="text-lg font-mono font-medium mt-0.5">
              {{ formatPercent(health.overall.avgConfidence) }}
            </p>
            <p class="text-[11px] text-toned mt-0.5">
              across all calls
            </p>
          </div>
        </div>
      </UiCard>
    </section>
    <!-- AI Uncertain — needs human decision -->
    <section v-if="queue?.uncertain?.length">
      <div class="mb-3 flex items-baseline gap-2">
        <h2 class="font-mono text-sm uppercase tracking-widest text-gray-700">
          AI uncertain — needs decision
        </h2>
        <span class="font-mono text-[10px] text-gray-400 tracking-widest">
          · {{ queue.uncertain.length }}
        </span>
      </div>
      <div class="space-y-2">
        <AdminQueueCard v-for="log in queue.uncertain" :key="log.id" :since="log.createdAt">
          <template #header>
            <div class="flex items-center gap-2 flex-wrap">
              <NuxtLink
                v-if="log.issue"
                class="font-medium hover:underline truncate"
                :to="`/issue/${log.issue.id}`"
              >
                #{{ log.issue.id }} {{ log.issue.title }}
              </NuxtLink>
              <UiBadge v-if="log.issue">
                {{ log.issue.type }}
              </UiBadge>
              <UiBadge v-if="detailConfidence(log.details) != null" variant="warning">
                {{ formatConfidence(detailConfidence(log.details)) }} confidence
              </UiBadge>
              <UiBadge
                v-if="detailAiDecision(log.details)"
                :variant="detailAiDecision(log.details) === 'approve' ? 'success' : 'error'"
              >
                AI: {{ detailAiDecision(log.details) }}
              </UiBadge>
              <AdminSlaBadge hide-when-fresh :since="log.createdAt" />
            </div>
            <p v-if="log.issue?.summary" class="text-sm text-toned line-clamp-2">
              {{ log.issue.summary }}
            </p>
            <p class="text-xs text-toned">
              {{ log.reason }}
            </p>
            <AdminAuthorBadge :author="log.user" :timestamp="log.createdAt" />
          </template>
          <template #actions>
            <template v-if="log.issue">
              <UButton
                color="primary"
                size="xs"
                :disabled="isPending(`approve-issue-${log.issue.id}`)"
                :loading="isPending(`approve-issue-${log.issue.id}`)"
                @click="forceApprove(log.issue.id)"
              >
                Approve
              </UButton>
              <UButton
                color="primary"
                size="xs"
                variant="soft"
                @click="openEditIssue({
                  id: log.issue.id,
                  title: log.issue.title,
                  summary: log.issue.summary ?? '',
                  description: null,
                  type: log.issue.type as 'issue' | 'solution',
                })"
              >
                Edit & approve
              </UButton>
              <UButton
                color="neutral"
                size="xs"
                variant="outline"
                @click="askReject('issue', log.issue.id, `#${log.issue.id} ${log.issue.title}`)"
              >
                Reject
              </UButton>
              <UButton
                color="neutral"
                size="xs"
                variant="ghost"
                @click="openRequestInfo(log.issue.id, detailQuestions(log.details).join('\n'))"
              >
                Ask Author
              </UButton>
            </template>
          </template>
          <template #meta>
            <div
              v-if="detailQuestions(log.details).length"
              class="bg-gray-50 rounded-lg px-3 py-2 text-xs"
            >
              <p class="font-medium text-gray-800 mb-1">
                AI wants to know:
              </p>
              <ul class="list-disc list-inside text-gray-700 space-y-0.5">
                <li v-for="(q, i) in detailQuestions(log.details)" :key="i">
                  {{ q }}
                </li>
              </ul>
            </div>
            <div
              v-if="log.issue?.infoRequest && !log.issue?.infoResponse"
              class="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-700"
            >
              Waiting for author response to: "{{ log.issue.infoRequest }}"
            </div>
            <div
              v-else-if="log.issue?.infoRequest && log.issue?.infoResponse"
              class="bg-primary-50 rounded-lg px-3 py-2 text-xs space-y-1"
            >
              <p class="text-primary-800 font-medium">
                Author responded:
              </p>
              <p class="text-primary-700">
                {{ log.issue.infoResponse }}
              </p>
              <UButton
                class="mt-1"
                color="primary"
                icon="lucide:sparkles"
                size="xs"
                variant="soft"
                :disabled="isPending(`remod-${log.issue.id}`)"
                :loading="isPending(`remod-${log.issue.id}`)"
                @click="triggerRemod(log.issue.id)"
              >
                Re-run auto-mod
              </UButton>
            </div>
          </template>
          <template #preview>
            <div v-if="log.issue?.description">
              <p class="text-[11px] uppercase tracking-wide text-toned mb-1">
                Description
              </p>
              <p class="text-gray-700 whitespace-pre-wrap line-clamp-6">
                {{ log.issue.description }}
              </p>
            </div>
            <div v-if="detailSimilar(log.details).length">
              <p class="text-[11px] uppercase tracking-wide text-toned mb-1">
                Similar approved
              </p>
              <ul class="space-y-0.5">
                <li v-for="s in detailSimilar(log.details)" :key="s.id">
                  <NuxtLink class="text-primary-600 hover:underline" :to="`/issue/${s.id}`">
                    #{{ s.id }}
                  </NuxtLink>
                  <span class="text-toned">
                    ({{ Math.round(s.similarity * 100) }}% match)
                  </span>
                </li>
              </ul>
            </div>
          </template>
        </AdminQueueCard>
      </div>
    </section>
    <!-- Info Received — ready for re-moderation -->
    <section v-if="queue?.infoReceived?.length">
      <div class="mb-3 flex items-baseline gap-2">
        <h2 class="font-mono text-sm uppercase tracking-widest text-gray-700">
          Author responded — ready for re-moderation
        </h2>
        <span class="font-mono text-[10px] text-gray-400 tracking-widest">
          · {{ queue.infoReceived.length }}
        </span>
      </div>
      <div class="space-y-2">
        <AdminQueueCard
          v-for="issue in queue.infoReceived"
          :key="issue.id"
          :since="issue.infoRespondedAt"
        >
          <template #header>
            <div class="flex items-center gap-2">
              <NuxtLink class="font-medium hover:underline truncate" :to="`/issue/${issue.id}`">
                #{{ issue.id }} {{ issue.title }}
              </NuxtLink>
              <UiBadge>
                {{ issue.type }}
              </UiBadge>
              <AdminSlaBadge hide-when-fresh :since="issue.infoRespondedAt" />
            </div>
            <p class="text-sm text-toned line-clamp-1">
              {{ issue.summary }}
            </p>
            <AdminAuthorBadge
              timestamp-label="responded"
              :author="issue.author"
              :timestamp="issue.infoRespondedAt"
            />
          </template>
          <template #actions>
            <UButton
              color="primary"
              icon="lucide:sparkles"
              size="xs"
              variant="soft"
              :disabled="isPending(`remod-${issue.id}`)"
              :loading="isPending(`remod-${issue.id}`)"
              @click="triggerRemod(issue.id)"
            >
              Re-run auto-mod
            </UButton>
            <UButton
              color="primary"
              size="xs"
              :disabled="isPending(`approve-issue-${issue.id}`)"
              :loading="isPending(`approve-issue-${issue.id}`)"
              @click="forceApprove(issue.id)"
            >
              Approve
            </UButton>
            <UButton
              color="neutral"
              size="xs"
              variant="ghost"
              @click="askReject('issue', issue.id, `#${issue.id} ${issue.title}`)"
            >
              Reject
            </UButton>
          </template>
          <template #meta>
            <div class="text-xs space-y-1">
              <p class="text-gray-500">
                Asked: {{ issue.infoRequest }}
              </p>
              <p class="text-gray-900 font-medium">
                Response: {{ issue.infoResponse }}
              </p>
            </div>
          </template>
          <template #preview>
            <div v-if="issue.description">
              <p class="text-[11px] uppercase tracking-wide text-toned mb-1">
                Description
              </p>
              <p class="text-gray-700 whitespace-pre-wrap line-clamp-6">
                {{ issue.description }}
              </p>
            </div>
          </template>
        </AdminQueueCard>
      </div>
    </section>
    <!-- Issue Appeals -->
    <section v-if="queue?.pendingAppeals?.length">
      <div class="mb-3 flex items-baseline gap-2">
        <h2 class="font-mono text-sm uppercase tracking-widest text-gray-700">
          Issue appeals
        </h2>
        <span class="font-mono text-[10px] text-gray-400 tracking-widest">
          · {{ queue.pendingAppeals.length }}
        </span>
      </div>
      <div class="space-y-2">
        <AdminQueueCard
          v-for="issue in queue.pendingAppeals"
          :key="issue.id"
          :since="issue.appealedAt"
        >
          <template #header>
            <div class="flex items-center gap-2">
              <NuxtLink class="font-medium hover:underline truncate" :to="`/issue/${issue.id}`">
                #{{ issue.id }} {{ issue.title }}
              </NuxtLink>
              <UiBadge>
                {{ issue.type }}
              </UiBadge>
              <UiBadge variant="error">
                {{ issue.status }}
              </UiBadge>
              <AdminSlaBadge hide-when-fresh :since="issue.appealedAt" />
            </div>
            <p v-if="issue.rejectionReason" class="text-xs text-red-600">
              Rejected: {{ issue.rejectionReason }}
            </p>
            <AdminAuthorBadge
              timestamp-label="appealed"
              :author="issue.author"
              :timestamp="issue.appealedAt"
            />
          </template>
          <template #actions>
            <UButton
              color="primary"
              size="xs"
              :disabled="isPending(`appeal-${issue.id}-approved`)"
              :loading="isPending(`appeal-${issue.id}-approved`)"
              @click="resolveAppeal(issue.id, 'approved')"
            >
              Grant
            </UButton>
            <UButton
              color="neutral"
              size="xs"
              variant="ghost"
              :disabled="isPending(`appeal-${issue.id}-denied`)"
              :loading="isPending(`appeal-${issue.id}-denied`)"
              @click="resolveAppeal(issue.id, 'denied')"
            >
              Deny
            </UButton>
          </template>
          <template #meta>
            <div
              v-if="issue.appealReason"
              class="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-700"
            >
              Appeal: {{ issue.appealReason }}
            </div>
          </template>
          <template #preview>
            <div v-if="issue.summary">
              <p class="text-[11px] uppercase tracking-wide text-toned mb-1">
                Summary
              </p>
              <p class="text-gray-700">
                {{ issue.summary }}
              </p>
            </div>
            <div v-if="issue.description">
              <p class="text-[11px] uppercase tracking-wide text-toned mb-1">
                Description
              </p>
              <p class="text-gray-700 whitespace-pre-wrap line-clamp-6">
                {{ issue.description }}
              </p>
            </div>
          </template>
        </AdminQueueCard>
      </div>
    </section>
    <!-- Pending Case Studies -->
    <section v-if="queue?.pendingCaseStudies?.length">
      <div class="mb-3 flex items-baseline gap-2">
        <h2 class="font-mono text-sm uppercase tracking-widest text-gray-700">
          Pending case studies
        </h2>
        <span class="font-mono text-[10px] text-gray-400 tracking-widest">
          · {{ queue.pendingCaseStudies.length }}
        </span>
      </div>
      <div class="space-y-2">
        <AdminQueueCard v-for="cs in queue.pendingCaseStudies" :key="cs.id" :since="cs.createdAt">
          <template #header>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-medium truncate">
                Case study on
                <NuxtLink v-if="cs.solution" class="hover:underline" :to="`/issue/${cs.solution.id}`">
                  #{{ cs.solution.id }} {{ cs.solution.title }}
                </NuxtLink>
              </span>
              <UiBadge>
                {{ cs.outcome }}
              </UiBadge>
              <AdminSlaBadge hide-when-fresh :since="cs.createdAt" />
            </div>
            <p class="text-xs text-toned">
              <UIcon class="inline size-3" name="lucide:map-pin" />
              {{ cs.locationName }}
              <span v-if="cs.implementer">
                · {{ cs.implementer }}
              </span>
            </p>
            <AdminAuthorBadge :author="cs.author" :timestamp="cs.createdAt" />
          </template>
          <template #actions>
            <UButton
              color="primary"
              size="xs"
              :disabled="isPending(`approve-cs-${cs.id}`)"
              :loading="isPending(`approve-cs-${cs.id}`)"
              @click="approveCaseStudy(cs.id)"
            >
              Approve
            </UButton>
            <UButton
              color="primary"
              size="xs"
              variant="soft"
              @click="openEditCaseStudy({
                id: cs.id,
                description: cs.description,
                implementer: cs.implementer,
                locationName: cs.locationName,
                outcome: cs.outcome,
              })"
            >
              Edit & approve
            </UButton>
            <UButton
              color="neutral"
              size="xs"
              variant="outline"
              @click="askReject('case-study', cs.id, `Case study #${cs.id} — ${cs.locationName}`)"
            >
              Reject
            </UButton>
            <UButton
              color="primary"
              icon="lucide:sparkles"
              size="xs"
              variant="soft"
              :disabled="isPending(`remod-cs-${cs.id}`)"
              :loading="isPending(`remod-cs-${cs.id}`)"
              @click="triggerCaseStudyRemod(cs.id)"
            >
              Re-run auto-mod
            </UButton>
          </template>
          <template #preview>
            <div v-if="cs.description">
              <p class="text-[11px] uppercase tracking-wide text-toned mb-1">
                Description
              </p>
              <p class="text-gray-700 whitespace-pre-wrap line-clamp-8">
                {{ cs.description }}
              </p>
            </div>
          </template>
        </AdminQueueCard>
      </div>
    </section>
    <!-- Ban Appeals -->
    <section v-if="queue?.banAppeals?.length">
      <div class="mb-3 flex items-baseline gap-2">
        <h2 class="font-mono text-sm uppercase tracking-widest text-gray-700">
          Ban appeals
        </h2>
        <span class="font-mono text-[10px] text-gray-400 tracking-widest">
          · {{ queue.banAppeals.length }}
        </span>
      </div>
      <div class="space-y-2">
        <AdminQueueCard v-for="user in queue.banAppeals" :key="user.id" :since="user.banAppealedAt">
          <template #header>
            <div class="flex items-center gap-2">
              <NuxtLink class="font-medium hover:underline" :to="`/admin/users/${user.id}`">
                {{ user.name || user.email }}
              </NuxtLink>
              <AdminSlaBadge hide-when-fresh :since="user.banAppealedAt" />
            </div>
            <p v-if="user.banReason" class="text-xs text-red-600">
              Ban reason: {{ user.banReason }}
            </p>
            <p class="text-[11px] text-toned">
              Trust score: {{ user.trustScore }}
            </p>
          </template>
          <template #actions>
            <UButton
              color="primary"
              size="xs"
              :disabled="isPending(`unban-${user.id}`)"
              :loading="isPending(`unban-${user.id}`)"
              @click="unbanUser(user.id)"
            >
              Unban
            </UButton>
            <UButton
              color="neutral"
              size="xs"
              variant="ghost"
              :disabled="isPending(`ban-deny-${user.id}`)"
              :loading="isPending(`ban-deny-${user.id}`)"
              @click="denyBanAppeal(user.id)"
            >
              Deny
            </UButton>
          </template>
          <template #meta>
            <div
              v-if="user.banAppealReason"
              class="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-700"
            >
              Appeal: {{ user.banAppealReason }}
            </div>
          </template>
        </AdminQueueCard>
      </div>
    </section>
    <!-- Empty state -->
    <UiEmptyState
      v-if="totalActionable === 0"
      compact
      description="Nothing needs attention right now."
      icon="lucide:check-circle"
      title="All clear"
    />
    <!-- Reject modal -->
    <AdminRejectModal v-model:open="rejectOpen" :target="rejectTarget?.label" @submit="onReject" />
    <!-- Edit & approve modal -->
    <AdminEditApproveModal
      v-model:open="editOpen"
      :case-study="editCaseStudy"
      :issue="editIssue"
      :kind="editKind"
      @submitted="refreshAll"
    />
    <!-- Request Info Modal -->
    <UModal v-model:open="requestInfoModalOpen">
      <template #content>
        <div class="p-4 space-y-3">
          <h3 class="font-medium">
            Ask author for more information
          </h3>
          <p class="text-sm text-toned">
            Issue #{{ requestInfoIssueId }} — the author will see this question and can respond. A new moderation pass runs automatically once they reply.
          </p>
          <UTextarea
            v-model="requestInfoText"
            autofocus
            placeholder="What do you need to know? e.g. 'Could you clarify what specific community this affects?'"
            :rows="4"
          />
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="closeRequestInfo">
              Cancel
            </UButton>
            <UButton
              color="primary"
              :disabled="!requestInfoText.trim() || isPending(`info-${requestInfoIssueId}`)"
              :loading="isPending(`info-${requestInfoIssueId}`)"
              @click="sendInfoRequest"
            >
              Send to Author
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
