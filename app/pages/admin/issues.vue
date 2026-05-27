<script setup lang="ts">
// USelectMenu rejects empty-string item values, so we use 'all' as the
// no-filter sentinel and strip it from the request.
const ALL = 'all'
const filter = ref(ALL)
const filterOptions = [
  { label: 'All', value: ALL },
  { label: 'Pending', value: 'pending' },
  { label: 'Appeals', value: 'appeals' },
  { label: 'Awaiting Info', value: 'awaiting_info' },
  { label: 'Info Received', value: 'info_received' },
]

const query = computed(() => ({
  ...(filter.value !== ALL && { filter: filter.value }),
}))

const { data: issues, refresh } = await useFetch('/api/admin/issues', { query })

const { run, isPending } = useAdminAction()

// Reject modal
const rejectOpen = ref(false)
const rejectIssue = ref<{ id: number, title: string } | null>(null)
function askReject(id: number, title: string) {
  rejectIssue.value = { id, title }
  rejectOpen.value = true
}
async function onReject(reason: string) {
  if (!rejectIssue.value) return
  const id = rejectIssue.value.id
  const result = await run(`reject-${id}`, () =>
    $fetch(`/api/admin/issues/${id}/reject`, { method: 'POST', body: { reason } }),
  )
  if (result) {
    rejectOpen.value = false
    rejectIssue.value = null
    await refresh()
  }
}

// Edit-approve modal
const editOpen = ref(false)
const editIssue = ref<{ id: number, title: string, summary: string, description: string | null, type: 'issue' | 'solution' } | null>(null)
function openEdit(i: { id: number, title: string, summary: string, description?: string | null, type: 'issue' | 'solution' }) {
  editIssue.value = {
    id: i.id,
    title: i.title,
    summary: i.summary,
    description: i.description ?? null,
    type: i.type,
  }
  editOpen.value = true
}

async function triggerRemod(id: number) {
  const result = await run(`remod-${id}`, () =>
    $fetch(`/api/admin/issues/${id}/remod`, { method: 'POST' as const }),
  )
  if (result) await refresh()
}

async function forceApprove(id: number) {
  const result = await run(`approve-${id}`, () =>
    $fetch(`/api/admin/issues/${id}/approve`, { method: 'POST', body: {} }),
  )
  if (result) await refresh()
}

async function resolveAppeal(id: number, status: 'approved' | 'denied') {
  const result = await run(`appeal-${id}-${status}`, () =>
    $fetch(`/api/admin/issues/${id}/appeal`, { method: 'PATCH', body: { status } }),
  )
  if (result) await refresh()
}

const statusVariant: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2 flex-wrap">
      <USelectMenu
        v-model="filter"
        :items="filterOptions"
        value-key="value"
        placeholder="Filter"
        class="w-40"
      />
      <span class="font-mono text-[10px] text-gray-400 uppercase tracking-widest ml-auto">
        {{ issues?.length ?? 0 }} result{{ (issues?.length ?? 0) === 1 ? '' : 's' }}
      </span>
    </div>

    <div v-if="issues?.length" class="space-y-3">
      <AdminQueueCard
        v-for="issue in issues"
        :key="issue.id"
        :since="issue.appealedAt ?? issue.infoRespondedAt ?? issue.createdAt"
      >
        <template #header>
          <div class="flex items-center gap-2 flex-wrap">
            <NuxtLink :to="`/issue/${issue.id}`" class="font-medium hover:underline truncate">
              #{{ issue.id }} {{ issue.title }}
            </NuxtLink>
            <UiBadge>{{ issue.type }}</UiBadge>
            <UiBadge :variant="statusVariant[issue.status] ?? 'default'">{{ issue.status }}</UiBadge>
            <AdminSlaBadge :since="issue.appealedAt ?? issue.infoRespondedAt ?? issue.createdAt" hide-when-fresh />
          </div>
          <p class="text-sm text-toned line-clamp-2">{{ issue.summary }}</p>
          <AdminAuthorBadge :author="issue.author" :timestamp="issue.createdAt" />
        </template>

        <template #actions>
          <template v-if="issue.infoRequest && issue.infoResponse && issue.status === 'pending'">
            <UButton
              size="xs"
              color="primary"
              variant="soft"
              icon="lucide:sparkles"
              :loading="isPending(`remod-${issue.id}`)"
              :disabled="isPending(`remod-${issue.id}`)"
              @click="triggerRemod(issue.id)"
            >
              Re-run auto-mod
            </UButton>
            <UButton
              size="xs"
              color="primary"
              :loading="isPending(`approve-${issue.id}`)"
              :disabled="isPending(`approve-${issue.id}`)"
              @click="forceApprove(issue.id)"
            >
              Approve
            </UButton>
            <UButton size="xs" color="primary" variant="soft" @click="openEdit({ id: issue.id, title: issue.title, summary: issue.summary, type: issue.type as 'issue' | 'solution' })">
              Edit & approve
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              @click="askReject(issue.id, issue.title)"
            >
              Reject
            </UButton>
          </template>
          <template v-else-if="issue.appealStatus === 'pending'">
            <UButton
              size="xs"
              color="primary"
              :loading="isPending(`appeal-${issue.id}-approved`)"
              :disabled="isPending(`appeal-${issue.id}-approved`)"
              @click="resolveAppeal(issue.id, 'approved')"
            >
              Grant Appeal
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              :loading="isPending(`appeal-${issue.id}-denied`)"
              :disabled="isPending(`appeal-${issue.id}-denied`)"
              @click="resolveAppeal(issue.id, 'denied')"
            >
              Deny Appeal
            </UButton>
          </template>
          <template v-else-if="issue.status === 'pending'">
            <UButton
              size="xs"
              color="primary"
              :loading="isPending(`approve-${issue.id}`)"
              :disabled="isPending(`approve-${issue.id}`)"
              @click="forceApprove(issue.id)"
            >
              Approve
            </UButton>
            <UButton size="xs" color="primary" variant="soft" @click="openEdit({ id: issue.id, title: issue.title, summary: issue.summary, type: issue.type as 'issue' | 'solution' })">
              Edit & approve
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              @click="askReject(issue.id, issue.title)"
            >
              Reject
            </UButton>
          </template>
          <template v-else>
            <UButton
              v-if="issue.status === 'rejected'"
              size="xs"
              color="primary"
              :loading="isPending(`approve-${issue.id}`)"
              :disabled="isPending(`approve-${issue.id}`)"
              @click="forceApprove(issue.id)"
            >
              Override: Approve
            </UButton>
            <UButton
              v-if="issue.status === 'approved'"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="askReject(issue.id, issue.title)"
            >
              Override: Reject
            </UButton>
          </template>
        </template>

        <template #meta>
          <div v-if="issue.rejectionReason" class="text-xs text-red-600">
            Rejected: {{ issue.rejectionReason }}
          </div>
          <div v-if="issue.appealReason" class="text-xs text-gray-700 bg-gray-50 rounded px-2 py-1">
            Appeal: {{ issue.appealReason }}
          </div>
          <div v-if="issue.infoRequest && !issue.infoResponse" class="text-xs text-gray-700 bg-gray-50 rounded px-2 py-1">
            Awaiting response: {{ issue.infoRequest }}
          </div>
          <template v-else-if="issue.infoRequest && issue.infoResponse">
            <div class="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">Asked: {{ issue.infoRequest }}</div>
            <div class="text-xs text-primary-700 bg-primary-50 rounded px-2 py-1">Response: {{ issue.infoResponse }}</div>
          </template>
        </template>
      </AdminQueueCard>
    </div>
    <UiEmptyState
      v-else
      icon="lucide:inbox"
      title="No issues match"
      description="Nothing here matches the current filter."
      compact
    />

    <AdminRejectModal
      v-model:open="rejectOpen"
      :target="rejectIssue ? `#${rejectIssue.id} ${rejectIssue.title}` : undefined"
      @submit="onReject"
    />

    <AdminEditApproveModal
      v-model:open="editOpen"
      kind="issue"
      :issue="editIssue"
      @submitted="refresh"
    />
  </div>
</template>
