<script setup lang="ts">
const typeFilter = ref('')
const statusFilter = ref('')
const page = ref(1)
const limit = 25

const typeOptions = [
  { label: 'All types', value: '' },
  { label: 'Moderation', value: 'moderation' },
  { label: 'Structure', value: 'structure' },
  { label: 'Trust Score', value: 'trust_score' },
  { label: 'Auto Ban', value: 'auto_ban' },
  { label: 'Appeal', value: 'appeal' },
  { label: 'Admin Override', value: 'admin_override' },
]

const statusOptions = [
  { label: 'All statuses', value: '' },
  { label: 'Needs Review', value: 'needs_review' },
  { label: 'Auto Resolved', value: 'auto_resolved' },
  { label: 'Reviewed', value: 'reviewed' },
  { label: 'Overridden', value: 'overridden' },
]

const query = computed(() => ({
  page: page.value,
  limit,
  ...(typeFilter.value && { type: typeFilter.value }),
  ...(statusFilter.value && { status: statusFilter.value }),
}))

const { data, refresh } = await useFetch('/api/admin/logs', { query })

const totalPages = computed(() => Math.ceil((data.value?.total ?? 0) / limit))

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
}

const expandedLogId = ref<number | null>(null)
const reviewingLog = ref<any>(null)
const reviewNote = ref('')
const reviewLoading = ref(false)
const actionLoading = ref<number | null>(null)

function summaryLine(log: any): string {
  const who = log.user?.name || log.user?.email || 'System'
  const issue = log.issue ? `#${log.issue.id}` : ''

  switch (log.action) {
    case 'approve': return `${issue} approved — ${truncate(log.reason, 80)}`
    case 'reject': return `${issue} rejected — ${truncate(log.reason, 80)}`
    case 'flag_spam': return `${issue} flagged as spam`
    case 'flag_duplicate': return `${issue} duplicate of #${log.details?.duplicateOfId ?? log.details?.targetId ?? '?'}`
    case 'reparent': return `${issue} moved under #${log.details?.targetId}`
    case 'convert_to_case_study': return `${issue} should be a case study of #${log.details?.targetId}`
    case 'ban': return `${who} auto-banned (${log.details?.rejectedCount}/${log.details?.lookbackWindow} rejected)`
    case 'unban': return `${who} unbanned`
    case 'score_update': return `${who}: ${log.details?.oldScore} → ${log.details?.newScore}`
    case 'appeal_submitted': return `${issue} appeal by ${who}`
    case 'appeal_approved': return `${issue} appeal granted`
    case 'appeal_denied': return `${issue} appeal denied`
    case 'override_approve': return `${issue} force-approved (was ${log.details?.previousStatus})`
    case 'override_reject': return `${issue} force-rejected (was ${log.details?.previousStatus})`
    case 'flag_uncertain': return `${issue} uncertain (${Math.round((log.details?.confidence as number ?? 0) * 100)}% confidence) — ${truncate(log.reason, 60)}`
    case 'request_info': return `${issue} info requested — ${truncate(log.reason, 60)}`
    default: return truncate(log.reason || '', 80)
  }
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '…' : s
}

async function markReviewed(log: any, status: 'reviewed' | 'overridden') {
  reviewLoading.value = true
  try {
    await $fetch(`/api/admin/logs/${log.id}`, {
      method: 'PATCH',
      body: { status, reviewNote: reviewNote.value || undefined },
    })
    reviewNote.value = ''
    await refresh()
  }
  finally {
    reviewLoading.value = false
  }
}

async function forceApprove(issueId: number) {
  actionLoading.value = issueId
  try {
    await $fetch(`/api/admin/issues/${issueId}/approve`, { method: 'POST', body: {} })
    await refresh()
  }
  finally {
    actionLoading.value = null
  }
}

async function forceReject(issueId: number) {
  const reason = prompt('Rejection reason:')
  if (!reason) return
  actionLoading.value = issueId
  try {
    await $fetch(`/api/admin/issues/${issueId}/reject`, { method: 'POST', body: { reason } })
    await refresh()
  }
  finally {
    actionLoading.value = null
  }
}

async function unbanUser(userId: string) {
  actionLoading.value = -1
  try {
    await $fetch(`/api/admin/users/${userId}/unban`, { method: 'POST', body: {} })
    await refresh()
  }
  finally {
    actionLoading.value = null
  }
}

function formatTime(date: string) {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
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

watch([typeFilter, statusFilter], () => { page.value = 1 })
</script>

<template>
  <div class="space-y-4">
    <div class="flex gap-3">
      <USelectMenu
        v-model="typeFilter"
        :items="typeOptions"
        value-key="value"
        placeholder="Type"
        class="w-40"
      />
      <USelectMenu
        v-model="statusFilter"
        :items="statusOptions"
        value-key="value"
        placeholder="Status"
        class="w-40"
      />
    </div>

    <UiCard padding="none">
      <div v-if="data?.logs?.length" class="divide-y divide-gray-100">
        <div v-for="log in data.logs" :key="log.id">
          <!-- Row -->
          <button
            class="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors"
            :class="[
              expandedLogId === log.id ? 'bg-gray-50' : 'hover:bg-gray-50/60',
              log.status === 'needs_review' ? 'border-l-2 border-l-yellow-400' : 'border-l-2 border-l-transparent',
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
              name="i-lucide-chevron-down"
              class="size-4 text-toned shrink-0 transition-transform"
              :class="{ 'rotate-180': expandedLogId === log.id }"
            />
          </button>

          <!-- Expanded detail -->
          <div v-if="expandedLogId === log.id" class="bg-gray-50/80 px-4 pb-4 pt-2 space-y-3 text-sm border-b border-gray-200">
            <!-- Reason -->
            <p v-if="log.reason" class="text-gray-600 leading-relaxed">{{ log.reason }}</p>

            <!-- Confidence + AI questions -->
            <div v-if="(log.details as any)?.confidence != null" class="flex items-center gap-2 text-xs">
              <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium" :class="(log.details as any).confidence >= 0.7 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'">
                <UIcon name="i-lucide-gauge" class="size-3" /> {{ Math.round((log.details as any).confidence * 100) }}% confidence
              </span>
              <span v-if="(log.details as any).aiDecision" class="text-toned">
                AI leaned: {{ (log.details as any).aiDecision }}
              </span>
            </div>
            <div v-if="(log.details as any)?.questions?.length" class="bg-yellow-50 rounded-lg px-3 py-2 text-xs">
              <p class="font-medium text-yellow-800 mb-1">AI questions for the author:</p>
              <ul class="list-disc list-inside text-yellow-700 space-y-0.5">
                <li v-for="(q, i) in (log.details as any).questions" :key="i">{{ q }}</li>
              </ul>
            </div>

            <!-- Metadata chips -->
            <div v-if="log.details" class="flex flex-wrap gap-1.5">
              <span v-if="log.details.isSpam" class="inline-flex items-center gap-1 bg-red-50 text-red-700 rounded-full px-2.5 py-0.5 text-xs font-medium">
                <UIcon name="i-lucide-shield-alert" class="size-3" /> Spam
              </span>
              <NuxtLink
                v-if="log.details.duplicateOfId"
                :to="`/issue/${log.details.duplicateOfId}`"
                class="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 rounded-full px-2.5 py-0.5 text-xs font-medium hover:bg-yellow-100"
              >
                <UIcon name="i-lucide-copy" class="size-3" /> Duplicate of #{{ log.details.duplicateOfId }}
              </NuxtLink>
              <NuxtLink
                v-if="log.details.targetId"
                :to="`/issue/${log.details.targetId}`"
                class="inline-flex items-center gap-1 bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5 text-xs font-medium hover:bg-blue-100"
              >
                <UIcon name="i-lucide-arrow-right" class="size-3" /> Target #{{ log.details.targetId }}
              </NuxtLink>
              <span
                v-if="log.details.oldScore != null"
                class="inline-flex items-center gap-1 bg-gray-100 text-gray-700 rounded-full px-2.5 py-0.5 text-xs font-medium"
              >
                <UIcon name="i-lucide-trending-up" class="size-3" /> {{ log.details.oldScore }} → {{ log.details.newScore }}
              </span>
              <span
                v-if="log.details.rejectedCount"
                class="inline-flex items-center gap-1 bg-red-50 text-red-700 rounded-full px-2.5 py-0.5 text-xs font-medium"
              >
                <UIcon name="i-lucide-x-circle" class="size-3" /> {{ log.details.rejectedCount }}/{{ log.details.lookbackWindow }} rejected
              </span>
              <span
                v-if="log.details.bannedUntil"
                class="inline-flex items-center gap-1 bg-red-50 text-red-700 rounded-full px-2.5 py-0.5 text-xs font-medium"
              >
                <UIcon name="i-lucide-clock" class="size-3" /> Until {{ new Date(log.details.bannedUntil as string).toLocaleDateString() }}
              </span>
              <span
                v-if="log.details.previousStatus"
                class="inline-flex items-center gap-1 bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5 text-xs font-medium"
              >
                Was: {{ log.details.previousStatus }}
              </span>
              <span
                v-for="tag in (log.details.newTags ?? [])"
                :key="tag"
                class="inline-flex items-center gap-1 bg-green-50 text-green-700 rounded-full px-2.5 py-0.5 text-xs font-medium"
              >
                <UIcon name="i-lucide-plus" class="size-3" /> {{ tag }}
              </span>
              <span
                v-if="((log.details as any)?.tags as string[] | undefined)?.length"
                class="inline-flex items-center gap-1 bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5 text-xs font-medium"
              >
                <UIcon name="i-lucide-tag" class="size-3" /> {{ (log.details as any).tags.length }} tag{{ (log.details as any).tags.length > 1 ? 's' : '' }}
              </span>
              <span
                v-if="((log.details as any)?.sdgs as string[] | undefined)?.length"
                class="inline-flex items-center gap-1 bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5 text-xs font-medium"
              >
                <UIcon name="i-lucide-globe" class="size-3" /> {{ (log.details as any).sdgs.length }} SDG{{ (log.details as any).sdgs.length > 1 ? 's' : '' }}
              </span>
            </div>

            <!-- Similar issues -->
            <div v-if="((log.details as any)?.similarIssues as Array<{ id: number, similarity: number }> | undefined)?.length" class="text-xs text-toned">
              Similar:
              <span v-for="(s, i) in (log.details as any).similarIssues as Array<{ id: number, similarity: number }>" :key="i">
                {{ i > 0 ? ', ' : '' }}
                <NuxtLink :to="`/issue/${s.id}`" class="text-primary-600 hover:underline">#{{ s.id }}</NuxtLink>
                <span class="text-toned">({{ Math.round(s.similarity * 100) }}%)</span>
              </span>
            </div>

            <!-- Admin review info -->
            <div v-if="log.reviewer || log.reviewNote" class="text-xs text-toned border-l-2 border-l-green-300 pl-2">
              <span v-if="log.reviewer">{{ log.reviewer.name }}</span>
              <span v-if="log.reviewNote"> — {{ log.reviewNote }}</span>
            </div>

            <!-- References + User -->
            <div class="flex items-center gap-3 text-xs text-toned">
              <span>{{ formatTimeFull(log.createdAt) }}</span>
              <span>{{ typeLabel[log.type] ?? log.type }}</span>
              <NuxtLink v-if="log.issue" :to="`/issue/${log.issue.id}`" class="hover:text-black" @click.stop>
                {{ log.issue.type }} #{{ log.issue.id }}
              </NuxtLink>
              <NuxtLink v-if="log.user" :to="`/user/${log.user.id}`" class="hover:text-black" @click.stop>
                {{ log.user.name || log.user.email }}
              </NuxtLink>
            </div>

            <!-- Raw JSON toggle -->
            <details class="text-xs">
              <summary class="text-toned cursor-pointer">Raw JSON</summary>
              <pre class="mt-1 bg-gray-100 rounded p-2 overflow-x-auto text-[11px]">{{ JSON.stringify(log.details, null, 2) }}</pre>
            </details>

            <!-- Quick actions bar -->
            <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200">
              <!-- Review controls for needs_review -->
              <template v-if="log.status === 'needs_review'">
                <UInput v-model="reviewNote" placeholder="Admin note..." class="w-48" size="xs" />
                <UButton size="xs" color="neutral" variant="outline" :loading="reviewLoading" @click="markReviewed(log, 'reviewed')">
                  Confirm
                </UButton>
                <UButton size="xs" color="primary" :loading="reviewLoading" @click="markReviewed(log, 'overridden')">
                  Override
                </UButton>
              </template>

              <!-- Issue actions -->
              <template v-if="log.issueId && (log.action === 'reject' || log.action === 'flag_spam' || log.action === 'flag_duplicate' || log.action === 'convert_to_case_study')">
                <UButton size="xs" color="primary" :loading="actionLoading === log.issueId" @click="forceApprove(log.issueId)">
                  Force Approve
                </UButton>
              </template>
              <template v-if="log.issueId && log.action === 'approve'">
                <UButton size="xs" color="neutral" variant="outline" :loading="actionLoading === log.issueId" @click="forceReject(log.issueId)">
                  Force Reject
                </UButton>
              </template>

              <!-- Ban actions -->
              <template v-if="log.action === 'ban' && log.userId">
                <UButton size="xs" color="primary" :loading="actionLoading === -1" @click="unbanUser(log.userId)">
                  Unban User
                </UButton>
              </template>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="px-4 py-8 text-center text-toned text-sm">
        No logs match your filters.
      </div>
    </UiCard>

    <div v-if="totalPages > 1" class="flex justify-center gap-2">
      <UButton
        variant="ghost"
        size="sm"
        :disabled="page <= 1"
        @click="page--"
      >
        Previous
      </UButton>
      <span class="text-sm text-toned self-center">Page {{ page }} of {{ totalPages }}</span>
      <UButton
        variant="ghost"
        size="sm"
        :disabled="page >= totalPages"
        @click="page++"
      >
        Next
      </UButton>
    </div>
  </div>
</template>
