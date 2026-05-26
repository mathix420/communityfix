<script setup lang="ts">
const { data: stats } = await useFetch('/api/admin/stats')
const { data: queue, refresh } = await useFetch('/api/admin/queue') as any

const actionLoading = ref<string | null>(null)
const requestInfoModalOpen = ref(false)
const requestInfoIssueId = ref(0)
const requestInfoText = ref('')

async function forceApprove(id: number) {
  actionLoading.value = `approve-${id}`
  try {
    await $fetch(`/api/admin/issues/${id}/approve`, { method: 'POST' as const, body: {} })
    await refresh()
  }
  finally {
    actionLoading.value = null
  }
}

async function forceReject(id: number) {
  const reason = prompt('Rejection reason:')
  if (!reason) return
  actionLoading.value = `reject-${id}`
  try {
    await $fetch(`/api/admin/issues/${id}/reject`, { method: 'POST' as const, body: { reason } })
    await refresh()
  }
  finally {
    actionLoading.value = null
  }
}

async function triggerRemod(id: number) {
  actionLoading.value = `remod-${id}`
  try {
    await $fetch(`/api/admin/issues/${id}/remod`, { method: 'POST' as const })
    await refresh()
  }
  finally {
    actionLoading.value = null
  }
}

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
  actionLoading.value = `info-${requestInfoIssueId.value}`
  try {
    await $fetch(`/api/admin/issues/${requestInfoIssueId.value}/request-info`, {
      method: 'POST' as const,
      body: { question: requestInfoText.value.trim() },
    })
    closeRequestInfo()
    await refresh()
  }
  finally {
    actionLoading.value = null
  }
}

async function resolveAppeal(id: number, status: 'approved' | 'denied') {
  actionLoading.value = `appeal-${id}-${status}`
  try {
    await $fetch(`/api/admin/issues/${id}/appeal`, { method: 'PATCH' as const, body: { status } })
    await refresh()
  }
  finally {
    actionLoading.value = null
  }
}

async function unbanUser(userId: string) {
  actionLoading.value = `unban-${userId}`
  try {
    await $fetch(`/api/admin/users/${userId}/unban`, { method: 'POST' as const, body: {} })
    await refresh()
  }
  finally {
    actionLoading.value = null
  }
}

async function denyBanAppeal(userId: string) {
  actionLoading.value = `ban-deny-${userId}`
  try {
    await $fetch(`/api/admin/users/${userId}/ban-appeal`, { method: 'PATCH' as const, body: { status: 'denied' } })
    await refresh()
  }
  finally {
    actionLoading.value = null
  }
}

function formatConfidence(c: number | undefined) {
  if (c == null) return ''
  return `${Math.round(c * 100)}%`
}

function formatTime(date: string | null | undefined) {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const totalActionable = computed(() => {
  if (!queue.value) return 0
  return (queue.value.uncertain?.length ?? 0)
    + (queue.value.pendingAppeals?.length ?? 0)
    + (queue.value.infoReceived?.length ?? 0)
    + (queue.value.banAppeals?.length ?? 0)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <UiCard padding="sm">
        <p class="text-xs text-toned uppercase tracking-wide">Action Needed</p>
        <p class="text-2xl font-semibold mt-1" :class="totalActionable > 0 ? 'text-yellow-600' : ''">
          {{ totalActionable }}
        </p>
      </UiCard>
      <UiCard padding="sm">
        <p class="text-xs text-toned uppercase tracking-wide">Pending Issues</p>
        <p class="text-2xl font-semibold mt-1">{{ stats?.pendingIssues ?? 0 }}</p>
      </UiCard>
      <UiCard padding="sm">
        <p class="text-xs text-toned uppercase tracking-wide">Needs Review</p>
        <p class="text-2xl font-semibold mt-1">{{ stats?.pendingReviews ?? 0 }}</p>
      </UiCard>
      <UiCard padding="sm">
        <p class="text-xs text-toned uppercase tracking-wide">Awaiting Info</p>
        <p class="text-2xl font-semibold mt-1">{{ stats?.awaitingInfo ?? 0 }}</p>
      </UiCard>
      <UiCard padding="sm">
        <p class="text-xs text-toned uppercase tracking-wide">Issue Appeals</p>
        <p class="text-2xl font-semibold mt-1">{{ stats?.issueAppeals ?? 0 }}</p>
      </UiCard>
      <UiCard padding="sm">
        <p class="text-xs text-toned uppercase tracking-wide">Ban Appeals</p>
        <p class="text-2xl font-semibold mt-1">{{ stats?.banAppeals ?? 0 }}</p>
      </UiCard>
    </div>

    <!-- AI Uncertain — needs human decision -->
    <section v-if="queue?.uncertain?.length">
      <h3 class="text-sm font-medium text-toned mb-3 flex items-center gap-2">
        <UIcon name="i-lucide-brain" class="size-4 text-yellow-500" />
        AI Uncertain — Needs Decision
      </h3>
      <div class="space-y-2">
        <UiCard v-for="log in queue.uncertain" :key="log.id" padding="sm">
          <div class="space-y-2">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  <NuxtLink v-if="log.issue" :to="`/issue/${log.issue.id}`" class="font-medium hover:underline truncate">
                    #{{ log.issue.id }} {{ log.issue.title }}
                  </NuxtLink>
                  <UiBadge v-if="log.issue">{{ log.issue.type }}</UiBadge>
                  <UiBadge v-if="log.details?.confidence != null" variant="warning">
                    {{ formatConfidence(log.details.confidence) }} confidence
                  </UiBadge>
                  <UiBadge v-if="log.details?.aiDecision" :variant="log.details.aiDecision === 'approve' ? 'success' : 'error'">
                    AI: {{ log.details.aiDecision }}
                  </UiBadge>
                </div>
                <p v-if="log.issue?.summary" class="text-sm text-toned line-clamp-2">{{ log.issue.summary }}</p>
                <p class="text-xs text-toned mt-1">{{ log.reason }}</p>
                <p v-if="log.user" class="text-xs text-toned mt-0.5">
                  By {{ log.user.name || log.user.email }} · {{ formatTime(log.createdAt) }}
                </p>
              </div>
              <div v-if="log.issue" class="flex flex-col gap-1.5 shrink-0">
                <UButton
                  size="xs"
                  color="primary"
                  :loading="actionLoading === `approve-${log.issue.id}`"
                  @click="forceApprove(log.issue.id)"
                >
                  Approve
                </UButton>
                <UButton
                  size="xs"
                  color="neutral"
                  variant="outline"
                  :loading="actionLoading === `reject-${log.issue.id}`"
                  @click="forceReject(log.issue.id)"
                >
                  Reject
                </UButton>
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  :loading="actionLoading === `info-${log.issue.id}`"
                  @click="openRequestInfo(log.issue.id, log.details?.questions?.join('\n') || '')"
                >
                  Ask Author
                </UButton>
              </div>
            </div>

            <!-- AI questions -->
            <div v-if="log.details?.questions?.length" class="bg-yellow-50 rounded-lg px-3 py-2 text-xs">
              <p class="font-medium text-yellow-800 mb-1">AI wants to know:</p>
              <ul class="list-disc list-inside text-yellow-700 space-y-0.5">
                <li v-for="(q, i) in log.details.questions" :key="i">{{ q }}</li>
              </ul>
            </div>

            <!-- Info request/response status -->
            <div v-if="log.issue?.infoRequest && !log.issue?.infoResponse" class="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
              Waiting for author response to: "{{ log.issue.infoRequest }}"
            </div>
            <div v-else-if="log.issue?.infoRequest && log.issue?.infoResponse" class="bg-green-50 rounded-lg px-3 py-2 text-xs space-y-1">
              <p class="text-green-800 font-medium">Author responded:</p>
              <p class="text-green-700">{{ log.issue.infoResponse }}</p>
              <UButton
                size="xs"
                color="primary"
                variant="soft"
                class="mt-1"
                :loading="actionLoading === `remod-${log.issue.id}`"
                @click="triggerRemod(log.issue.id)"
              >
                Re-run Moderation
              </UButton>
            </div>
          </div>
        </UiCard>
      </div>
    </section>

    <!-- Info Received — ready for re-moderation -->
    <section v-if="queue?.infoReceived?.length">
      <h3 class="text-sm font-medium text-toned mb-3 flex items-center gap-2">
        <UIcon name="i-lucide-message-circle" class="size-4 text-green-500" />
        Author Responded — Ready for Re-moderation
      </h3>
      <div class="space-y-2">
        <UiCard v-for="issue in queue.infoReceived" :key="issue.id" padding="sm">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 mb-1">
                <NuxtLink :to="`/issue/${issue.id}`" class="font-medium hover:underline truncate">
                  #{{ issue.id }} {{ issue.title }}
                </NuxtLink>
                <UiBadge>{{ issue.type }}</UiBadge>
              </div>
              <p class="text-sm text-toned line-clamp-1">{{ issue.summary }}</p>
              <div class="mt-2 space-y-1 text-xs">
                <p class="text-gray-500">Asked: {{ issue.infoRequest }}</p>
                <p class="text-green-700 font-medium">Response: {{ issue.infoResponse }}</p>
              </div>
              <p v-if="issue.author" class="text-xs text-toned mt-1">
                {{ issue.author.name || issue.author.email }} · responded {{ formatTime(issue.infoRespondedAt) }}
              </p>
            </div>
            <div class="flex flex-col gap-1.5 shrink-0">
              <UButton
                size="xs"
                color="primary"
                :loading="actionLoading === `remod-${issue.id}`"
                @click="triggerRemod(issue.id)"
              >
                Re-moderate
              </UButton>
              <UButton
                size="xs"
                color="primary"
                variant="soft"
                :loading="actionLoading === `approve-${issue.id}`"
                @click="forceApprove(issue.id)"
              >
                Approve
              </UButton>
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                :loading="actionLoading === `reject-${issue.id}`"
                @click="forceReject(issue.id)"
              >
                Reject
              </UButton>
            </div>
          </div>
        </UiCard>
      </div>
    </section>

    <!-- Issue Appeals -->
    <section v-if="queue?.pendingAppeals?.length">
      <h3 class="text-sm font-medium text-toned mb-3 flex items-center gap-2">
        <UIcon name="i-lucide-scale" class="size-4 text-orange-500" />
        Issue Appeals
      </h3>
      <div class="space-y-2">
        <UiCard v-for="issue in queue.pendingAppeals" :key="issue.id" padding="sm">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 mb-1">
                <NuxtLink :to="`/issue/${issue.id}`" class="font-medium hover:underline truncate">
                  #{{ issue.id }} {{ issue.title }}
                </NuxtLink>
                <UiBadge>{{ issue.type }}</UiBadge>
                <UiBadge variant="error">{{ issue.status }}</UiBadge>
              </div>
              <p v-if="issue.rejectionReason" class="text-xs text-red-600 mt-1">
                Rejected: {{ issue.rejectionReason }}
              </p>
              <div v-if="issue.appealReason" class="bg-yellow-50 rounded-lg px-3 py-2 text-xs text-yellow-700 mt-2">
                Appeal: {{ issue.appealReason }}
              </div>
              <p v-if="issue.author" class="text-xs text-toned mt-1">
                {{ issue.author.name || issue.author.email }} · appealed {{ formatTime(issue.appealedAt) }}
              </p>
            </div>
            <div class="flex flex-col gap-1.5 shrink-0">
              <UButton
                size="xs"
                color="primary"
                :loading="actionLoading === `appeal-${issue.id}-approved`"
                @click="resolveAppeal(issue.id, 'approved')"
              >
                Grant
              </UButton>
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                :loading="actionLoading === `appeal-${issue.id}-denied`"
                @click="resolveAppeal(issue.id, 'denied')"
              >
                Deny
              </UButton>
            </div>
          </div>
        </UiCard>
      </div>
    </section>

    <!-- Ban Appeals -->
    <section v-if="queue?.banAppeals?.length">
      <h3 class="text-sm font-medium text-toned mb-3 flex items-center gap-2">
        <UIcon name="i-lucide-user-x" class="size-4 text-red-500" />
        Ban Appeals
      </h3>
      <div class="space-y-2">
        <UiCard v-for="user in queue.banAppeals" :key="user.id" padding="sm">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="font-medium">{{ user.name || user.email }}</p>
              <p v-if="user.banReason" class="text-xs text-red-600 mt-1">Ban reason: {{ user.banReason }}</p>
              <div v-if="user.banAppealReason" class="bg-yellow-50 rounded-lg px-3 py-2 text-xs text-yellow-700 mt-2">
                Appeal: {{ user.banAppealReason }}
              </div>
              <p class="text-xs text-toned mt-1">Appealed {{ formatTime(user.banAppealedAt) }}</p>
            </div>
            <div class="flex flex-col gap-1.5 shrink-0">
              <UButton
                size="xs"
                color="primary"
                :loading="actionLoading === `unban-${user.id}`"
                @click="unbanUser(user.id)"
              >
                Unban
              </UButton>
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                :loading="actionLoading === `ban-deny-${user.id}`"
                @click="denyBanAppeal(user.id)"
              >
                Deny
              </UButton>
            </div>
          </div>
        </UiCard>
      </div>
    </section>

    <!-- Empty state -->
    <UiCard v-if="totalActionable === 0" padding="md">
      <div class="text-center py-4">
        <UIcon name="i-lucide-check-circle" class="size-8 text-green-400 mx-auto mb-2" />
        <p class="text-sm text-toned">All clear — nothing needs attention.</p>
      </div>
    </UiCard>

    <!-- Request Info Modal -->
    <UModal v-model:open="requestInfoModalOpen">
      <template #content>
        <div class="p-4 space-y-3">
          <h3 class="font-medium">Ask author for more information</h3>
          <p class="text-sm text-toned">Issue #{{ requestInfoIssueId }} — The author will see this question and can respond. A new moderation pass will run automatically after they respond.</p>
          <UTextarea
            v-model="requestInfoText"
            placeholder="What do you need to know? e.g. 'Could you clarify what specific community this affects?'"
            :rows="4"
            autofocus
          />
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="closeRequestInfo">Cancel</UButton>
            <UButton
              color="primary"
              :loading="actionLoading === `info-${requestInfoIssueId}`"
              :disabled="!requestInfoText.trim()"
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
