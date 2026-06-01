<script setup lang="ts">
// Nuxt UI's USelectMenu / ComboboxItem rejects items with an empty-string
// `value` (it reserves '' as "no selection"). Use a sentinel for the
// "All" option and translate it away when building the request.
const ALL = 'all'

const typeFilter = ref(ALL)
const statusFilter = ref(ALL)
const issueIdFilter = ref('')
const userIdFilter = ref('')
const search = ref('')
const fromDate = ref('')
const toDate = ref('')
const page = ref(1)
const limit = ref(25)

const typeOptions = [
  { label: 'All types', value: ALL },
  { label: 'Moderation', value: 'moderation' },
  { label: 'Structure', value: 'structure' },
  { label: 'Trust Score', value: 'trust_score' },
  { label: 'Auto Ban', value: 'auto_ban' },
  { label: 'Appeal', value: 'appeal' },
  { label: 'Admin Override', value: 'admin_override' },
]

const statusOptions = [
  { label: 'All statuses', value: ALL },
  { label: 'Needs Review', value: 'needs_review' },
  { label: 'Auto Resolved', value: 'auto_resolved' },
  { label: 'Reviewed', value: 'reviewed' },
  { label: 'Overridden', value: 'overridden' },
]

const limitOptions = [
  { label: '10 / page', value: 10 },
  { label: '25 / page', value: 25 },
  { label: '50 / page', value: 50 },
  { label: '100 / page', value: 100 },
]

// Debounce free-text and id inputs so we don't refetch on every keystroke.
const debouncedSearch = ref('')
const debouncedIssueId = ref('')
const debouncedUserId = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch([search, issueIdFilter, userIdFilter], () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    debouncedSearch.value = search.value.trim()
    debouncedIssueId.value = issueIdFilter.value.trim()
    debouncedUserId.value = userIdFilter.value.trim()
    page.value = 1
  }, 300)
})

const query = computed(() => ({
  page: page.value,
  limit: limit.value,
  ...(typeFilter.value !== ALL && { type: typeFilter.value }),
  ...(statusFilter.value !== ALL && { status: statusFilter.value }),
  ...(debouncedSearch.value && { q: debouncedSearch.value }),
  ...(debouncedIssueId.value && { issueId: debouncedIssueId.value }),
  ...(debouncedUserId.value && { userId: debouncedUserId.value }),
  ...(fromDate.value && { from: fromDate.value }),
  ...(toDate.value && { to: toDate.value }),
}))

const { data, refresh } = await useFetch('/api/admin/logs', { query })
const { run, isPending } = useAdminAction()

const totalPages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / limit.value)))

const typeLabel: Record<string, string> = {
  moderation: 'Moderation',
  structure: 'Structure',
  trust_score: 'Trust',
  auto_ban: 'Ban',
  appeal: 'Appeal',
  admin_override: 'Override',
}

const actionLabel: Record<string, string> = {
  approve: 'Approved',
  reject: 'Rejected',
  flag_spam: 'Spam',
  flag_duplicate: 'Duplicate',
  flag_uncertain: 'Uncertain',
  request_info: 'Info requested',
  reparent: 'Reparented',
  convert_to_case_study: 'Case study',
  ban: 'Banned',
  unban: 'Unbanned',
  score_update: 'Score changed',
  appeal_submitted: 'Appeal filed',
  appeal_approved: 'Appeal granted',
  appeal_denied: 'Appeal denied',
  override_approve: 'Force approved',
  override_reject: 'Force rejected',
  remod: 'Re-mod',
  relocate: 'Location corrected',
  curate: 'Curated',
}

const statusVariant: Record<string, 'default' | 'warning' | 'success' | 'primary'> = {
  auto_resolved: 'default',
  needs_review: 'warning',
  reviewed: 'success',
  overridden: 'primary',
}

const statusLabel: Record<string, string> = {
  auto_resolved: 'Auto',
  needs_review: 'Review',
  reviewed: 'Done',
  overridden: 'Overridden',
}

const actionVariant: Record<string, 'default' | 'success' | 'error' | 'warning' | 'primary'> = {
  approve: 'success',
  reject: 'error',
  flag_spam: 'error',
  flag_duplicate: 'warning',
  flag_uncertain: 'warning',
  request_info: 'primary',
  ban: 'error',
  unban: 'success',
  override_approve: 'success',
  override_reject: 'error',
  appeal_approved: 'success',
  appeal_denied: 'error',
  appeal_submitted: 'warning',
  reparent: 'primary',
  convert_to_case_study: 'primary',
  score_update: 'default',
  remod: 'primary',
}

interface LogRow {
  id: number
  type: string
  action: string
  status: string
  reason: string | null
  details: Record<string, unknown> | null
  createdAt: string
  reviewedAt: string | null
  reviewNote: string | null
  issueId: number | null
  userId: string | null
  issue: { id: number, title: string, type: string, status: string } | null
  user: { id: string, name: string | null, email: string } | null
  reviewer: { id: string, name: string | null } | null
}

const expandedLogId = ref<number | null>(null)
const reviewNote = ref('')

function summaryLine(log: LogRow): string {
  const who = log.user?.name || log.user?.email || 'System'
  const issue = log.issue ? `#${log.issue.id}` : ''
  const d = log.details ?? {}

  switch (log.action) {
    case 'approve': return `${issue} approved — ${truncate(log.reason, 80)}`
    case 'reject': return `${issue} rejected — ${truncate(log.reason, 80)}`
    case 'flag_spam': return `${issue} flagged as spam`
    case 'flag_duplicate': return `${issue} duplicate of #${(d.duplicateOfId as number | undefined) ?? (d.targetId as number | undefined) ?? '?'}`
    case 'reparent': return `${issue} moved under #${d.targetId as number | undefined}`
    case 'convert_to_case_study': return `${issue} should be a case study of #${d.targetId as number | undefined}`
    case 'ban': return `${who} auto-banned (${d.rejectedCount as number | undefined}/${d.lookbackWindow as number | undefined} rejected)`
    case 'unban': return `${who} unbanned`
    case 'score_update': return `${who}: ${d.oldScore as number | undefined} → ${d.newScore as number | undefined}`
    case 'appeal_submitted': return `${issue} appeal by ${who}`
    case 'appeal_approved': return `${issue} appeal granted`
    case 'appeal_denied': return `${issue} appeal denied`
    case 'override_approve': return `${issue} force-approved (was ${d.previousStatus as string | undefined})`
    case 'override_reject': return `${issue} force-rejected (was ${d.previousStatus as string | undefined})`
    case 'remod': return `${issue || (d.caseStudyId ? `case study #${d.caseStudyId}` : '')} re-moderation triggered (was ${d.previousStatus as string | undefined})`
    case 'flag_uncertain': return `${issue} uncertain (${Math.round(((d.confidence as number | undefined) ?? 0) * 100)}% confidence) — ${truncate(log.reason, 60)}`
    case 'request_info': return `${issue} info requested — ${truncate(log.reason, 60)}`
    default: return truncate(log.reason || '', 80)
  }
}

function truncate(s: string | null, n: number) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n) + '…' : s
}

async function markReviewed(log: LogRow, status: 'reviewed' | 'overridden') {
  const result = await run(`mark-${log.id}-${status}`, () =>
    $fetch(`/api/admin/logs/${log.id}`, {
      method: 'PATCH',
      body: { status, reviewNote: reviewNote.value || undefined },
    }),
  )
  if (result) {
    reviewNote.value = ''
    await refresh()
  }
}

async function forceApprove(issueId: number) {
  const result = await run(`approve-${issueId}`, () =>
    $fetch(`/api/admin/issues/${issueId}/approve`, { method: 'POST', body: {} }),
  )
  if (result) await refresh()
}

// Reject modal
const rejectOpen = ref(false)
const rejectIssue = ref<number | null>(null)
function askReject(issueId: number) {
  rejectIssue.value = issueId
  rejectOpen.value = true
}
async function onReject(reason: string) {
  if (rejectIssue.value == null) return
  const id = rejectIssue.value
  const result = await run(`reject-${id}`, () =>
    $fetch(`/api/admin/issues/${id}/reject`, { method: 'POST', body: { reason } }),
  )
  if (result) {
    rejectOpen.value = false
    rejectIssue.value = null
    await refresh()
  }
}

async function unbanUser(userId: string) {
  const result = await run(`unban-${userId}`, () =>
    $fetch(`/api/admin/users/${userId}/unban`, { method: 'POST', body: {} }),
  )
  if (result) await refresh()
}

function formatTime(date: string) {
  const d = new Date(date)
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTimeFull(date: string) {
  return new Date(date).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function clearFilters() {
  typeFilter.value = ALL
  statusFilter.value = ALL
  issueIdFilter.value = ''
  userIdFilter.value = ''
  search.value = ''
  fromDate.value = ''
  toDate.value = ''
  page.value = 1
}

const jumpPage = ref('')
function jumpToPage() {
  const n = Number(jumpPage.value)
  if (!Number.isFinite(n) || n < 1 || n > totalPages.value) return
  page.value = n
  jumpPage.value = ''
}

watch([typeFilter, statusFilter, fromDate, toDate, limit], () => { page.value = 1 })

const hasActiveFilters = computed(() =>
  typeFilter.value !== ALL || statusFilter.value !== ALL
  || !!(issueIdFilter.value || userIdFilter.value || search.value || fromDate.value || toDate.value),
)

// Cast narrowed once at the boundary instead of casting at every site.
const logs = computed<LogRow[]>(() => (data.value?.logs as LogRow[] | undefined) ?? [])
</script>

<template>
  <div class="space-y-4">
    <!-- Filter bar -->
    <UiCard padding="sm">
      <div class="space-y-2">
        <div class="flex flex-wrap gap-2 items-center">
          <UInput
            v-model="search"
            placeholder="Search reason..."
            icon="lucide:search"
            class="flex-1 min-w-[180px]"
          />
          <USelectMenu v-model="typeFilter" :items="typeOptions" value-key="value" placeholder="Type" class="w-36" />
          <USelectMenu v-model="statusFilter" :items="statusOptions" value-key="value" placeholder="Status" class="w-36" />
          <USelectMenu v-model="limit" :items="limitOptions" value-key="value" class="w-32" />
        </div>
        <div class="flex flex-wrap gap-2 items-center">
          <UInput v-model="issueIdFilter" placeholder="Issue ID" type="number" class="w-32" />
          <UInput v-model="userIdFilter" placeholder="User ID (uuid)" class="w-72" />
          <label class="text-xs text-toned inline-flex items-center gap-1">
            From <UInput v-model="fromDate" type="date" />
          </label>
          <label class="text-xs text-toned inline-flex items-center gap-1">
            To <UInput v-model="toDate" type="date" />
          </label>
          <UButton v-if="hasActiveFilters" size="xs" variant="ghost" color="neutral" @click="clearFilters">
            Clear filters
          </UButton>
          <span class="text-xs text-toned ml-auto">
            {{ data?.total ?? 0 }} result{{ (data?.total ?? 0) === 1 ? '' : 's' }}
          </span>
        </div>
      </div>
    </UiCard>

    <UiCard v-if="logs.length" padding="none">
      <div class="divide-y divide-gray-100">
        <div v-for="log in logs" :key="log.id">
          <!-- Row -->
          <button
            class="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors"
            :class="[
              expandedLogId === log.id ? 'bg-gray-50' : 'hover:bg-gray-50/60',
              log.status === 'needs_review' ? 'border-l-2 border-l-primary-500' : 'border-l-2 border-l-transparent',
            ]"
            @click="expandedLogId = expandedLogId === log.id ? null : log.id"
          >
            <span class="text-[11px] text-toned tabular-nums w-16 shrink-0" :title="formatTimeFull(log.createdAt)">
              {{ formatTime(log.createdAt) }}
            </span>
            <UiBadge :variant="actionVariant[log.action] ?? 'default'" class="shrink-0">
              {{ actionLabel[log.action] ?? log.action }}
            </UiBadge>
            <span class="text-sm text-gray-700 truncate min-w-0 flex-1">
              {{ summaryLine(log) }}
            </span>
            <UiBadge :variant="statusVariant[log.status] ?? 'default'" class="shrink-0">
              {{ statusLabel[log.status] ?? log.status }}
            </UiBadge>
            <UIcon
              name="lucide:chevron-down"
              class="size-4 text-toned shrink-0 transition-transform"
              :class="{ 'rotate-180': expandedLogId === log.id }"
            />
          </button>

          <!-- Expanded detail -->
          <div v-if="expandedLogId === log.id" class="bg-gray-50/80 px-4 pb-4 pt-2 space-y-3 text-sm border-b border-gray-200">
            <p v-if="log.reason" class="text-gray-600 leading-relaxed">{{ log.reason }}</p>

            <div v-if="(log.details?.confidence as number | undefined) != null" class="flex items-center gap-2 text-xs">
              <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium" :class="(log.details!.confidence as number) >= 0.7 ? 'bg-primary-50 text-primary-700' : 'bg-gray-100 text-gray-700'">
                <UIcon name="lucide:gauge" class="size-3" /> {{ Math.round((log.details!.confidence as number) * 100) }}% confidence
              </span>
              <span v-if="log.details!.aiDecision" class="text-toned">
                AI leaned: {{ log.details!.aiDecision }}
              </span>
            </div>

            <div v-if="(log.details?.questions as string[] | undefined)?.length" class="bg-gray-50 rounded-lg px-3 py-2 text-xs">
              <p class="font-medium text-gray-800 mb-1">AI questions for the author:</p>
              <ul class="list-disc list-inside text-gray-700 space-y-0.5">
                <li v-for="(q, i) in (log.details!.questions as string[])" :key="i">{{ q }}</li>
              </ul>
            </div>

            <div v-if="log.details" class="flex flex-wrap gap-1.5">
              <span v-if="log.details.isSpam" class="inline-flex items-center gap-1 bg-red-50 text-red-700 rounded-full px-2.5 py-0.5 text-xs font-medium">
                <UIcon name="lucide:shield-alert" class="size-3" /> Spam
              </span>
              <NuxtLink
                v-if="log.details.duplicateOfId"
                :to="`/issue/${log.details.duplicateOfId}`"
                class="inline-flex items-center gap-1 bg-gray-100 text-gray-700 rounded-full px-2.5 py-0.5 text-xs font-medium hover:bg-gray-200"
              >
                <UIcon name="lucide:copy" class="size-3" /> Duplicate of #{{ log.details.duplicateOfId }}
              </NuxtLink>
              <NuxtLink
                v-if="log.details.targetId"
                :to="`/issue/${log.details.targetId}`"
                class="inline-flex items-center gap-1 bg-primary-50 text-primary-700 rounded-full px-2.5 py-0.5 text-xs font-medium hover:bg-primary-100"
              >
                <UIcon name="lucide:arrow-right" class="size-3" /> Target #{{ log.details.targetId }}
              </NuxtLink>
              <span
                v-if="log.details.oldScore != null"
                class="inline-flex items-center gap-1 bg-gray-100 text-gray-700 rounded-full px-2.5 py-0.5 text-xs font-medium"
              >
                <UIcon name="lucide:trending-up" class="size-3" /> {{ log.details.oldScore }} → {{ log.details.newScore }}
              </span>
              <span
                v-if="log.details.previousStatus"
                class="inline-flex items-center gap-1 bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5 text-xs font-medium"
              >
                Was: {{ log.details.previousStatus }}
              </span>
            </div>

            <div v-if="((log.details?.similarIssues as Array<{ id: number, similarity: number }> | undefined))?.length" class="text-xs text-toned">
              Similar:
              <span v-for="(s, i) in (log.details!.similarIssues as Array<{ id: number, similarity: number }>)" :key="i">
                {{ i > 0 ? ', ' : '' }}
                <NuxtLink :to="`/issue/${s.id}`" class="text-primary-600 hover:underline">#{{ s.id }}</NuxtLink>
                <span class="text-toned">({{ Math.round(s.similarity * 100) }}%)</span>
              </span>
            </div>

            <div v-if="log.reviewer || log.reviewNote" class="text-xs text-toned border-l-2 border-l-gray-300 pl-2">
              <span v-if="log.reviewer">{{ log.reviewer.name }}</span>
              <span v-if="log.reviewNote"> — {{ log.reviewNote }}</span>
            </div>

            <div class="flex items-center gap-3 text-xs text-toned">
              <span>{{ formatTimeFull(log.createdAt) }}</span>
              <span>{{ typeLabel[log.type] ?? log.type }}</span>
              <NuxtLink v-if="log.issue" :to="`/issue/${log.issue.id}`" class="hover:text-black" @click.stop>
                {{ log.issue.type }} #{{ log.issue.id }}
              </NuxtLink>
              <NuxtLink v-if="log.user" :to="`/admin/users/${log.user.id}`" class="hover:text-black" @click.stop>
                {{ log.user.name || log.user.email }}
              </NuxtLink>
            </div>

            <details class="text-xs">
              <summary class="text-toned cursor-pointer">Raw JSON</summary>
              <pre class="mt-1 bg-gray-100 rounded p-2 overflow-x-auto text-[11px]">{{ JSON.stringify(log.details, null, 2) }}</pre>
            </details>

            <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200">
              <template v-if="log.status === 'needs_review'">
                <UInput v-model="reviewNote" placeholder="Admin note..." class="w-48" size="xs" />
                <UButton
                  size="xs"
                  color="neutral"
                  variant="outline"
                  :loading="isPending(`mark-${log.id}-reviewed`)"
                  :disabled="isPending(`mark-${log.id}-reviewed`)"
                  @click="markReviewed(log, 'reviewed')"
                >
                  Confirm
                </UButton>
                <UButton
                  size="xs"
                  color="primary"
                  :loading="isPending(`mark-${log.id}-overridden`)"
                  :disabled="isPending(`mark-${log.id}-overridden`)"
                  @click="markReviewed(log, 'overridden')"
                >
                  Override
                </UButton>
              </template>

              <template v-if="log.issueId && (log.action === 'reject' || log.action === 'flag_spam' || log.action === 'flag_duplicate' || log.action === 'convert_to_case_study')">
                <UButton
                  size="xs"
                  color="primary"
                  :loading="isPending(`approve-${log.issueId}`)"
                  :disabled="isPending(`approve-${log.issueId}`)"
                  @click="forceApprove(log.issueId)"
                >
                  Force Approve
                </UButton>
              </template>
              <template v-if="log.issueId && log.action === 'approve'">
                <UButton size="xs" color="neutral" variant="outline" @click="askReject(log.issueId)">
                  Force Reject
                </UButton>
              </template>

              <template v-if="log.action === 'ban' && log.userId">
                <UButton
                  size="xs"
                  color="primary"
                  :loading="isPending(`unban-${log.userId}`)"
                  :disabled="isPending(`unban-${log.userId}`)"
                  @click="unbanUser(log.userId)"
                >
                  Unban User
                </UButton>
              </template>
            </div>
          </div>
        </div>
      </div>
    </UiCard>
    <UiEmptyState
      v-else
      icon="lucide:file-search"
      title="No logs match"
      description="Try widening your filters or clearing the search."
      compact
    />

    <div v-if="totalPages > 1" class="flex justify-center items-center gap-2 flex-wrap">
      <UButton variant="ghost" size="sm" :disabled="page <= 1" @click="page = 1">
        First
      </UButton>
      <UButton variant="ghost" size="sm" :disabled="page <= 1" @click="page--">
        Previous
      </UButton>
      <span class="text-sm text-toned self-center">Page {{ page }} of {{ totalPages }}</span>
      <UButton variant="ghost" size="sm" :disabled="page >= totalPages" @click="page++">
        Next
      </UButton>
      <UButton variant="ghost" size="sm" :disabled="page >= totalPages" @click="page = totalPages">
        Last
      </UButton>
      <span class="text-xs text-toned ml-2">Jump:</span>
      <UInput v-model="jumpPage" type="number" :min="1" :max="totalPages" size="xs" class="w-20" @keyup.enter="jumpToPage" />
      <UButton size="xs" variant="outline" :disabled="!jumpPage" @click="jumpToPage">Go</UButton>
    </div>

    <AdminRejectModal
      v-model:open="rejectOpen"
      :target="rejectIssue ? `Issue #${rejectIssue}` : undefined"
      @submit="onReject"
    />
  </div>
</template>
