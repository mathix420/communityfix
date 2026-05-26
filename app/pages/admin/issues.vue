<script setup lang="ts">
const filter = ref('')
const filterOptions = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Appeals', value: 'appeals' },
  { label: 'Awaiting Info', value: 'awaiting_info' },
  { label: 'Info Received', value: 'info_received' },
]

const query = computed(() => ({
  ...(filter.value && { filter: filter.value }),
}))

const { data: issues, refresh } = await useFetch('/api/admin/issues', { query })

const actionLoading = ref<number | null>(null)
const remodLoading = ref<number | null>(null)

async function triggerRemod(id: number) {
  remodLoading.value = id
  try {
    await $fetch(`/api/admin/issues/${id}/remod`, { method: 'POST' as const })
    await refresh()
  }
  finally {
    remodLoading.value = null
  }
}

async function forceApprove(id: number) {
  actionLoading.value = id
  try {
    await $fetch(`/api/admin/issues/${id}/approve`, { method: 'POST', body: {} })
    await refresh()
  }
  finally {
    actionLoading.value = null
  }
}

async function forceReject(id: number) {
  const reason = prompt('Rejection reason:')
  if (!reason) return
  actionLoading.value = id
  try {
    await $fetch(`/api/admin/issues/${id}/reject`, { method: 'POST', body: { reason } })
    await refresh()
  }
  finally {
    actionLoading.value = null
  }
}

async function resolveAppeal(id: number, status: 'approved' | 'denied') {
  actionLoading.value = id
  try {
    await $fetch(`/api/admin/issues/${id}/appeal`, { method: 'PATCH', body: { status } })
    await refresh()
  }
  finally {
    actionLoading.value = null
  }
}

const statusVariant: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
}
</script>

<template>
  <div class="space-y-4">
    <USelectMenu
      v-model="filter"
      :items="filterOptions"
      value-key="value"
      placeholder="Filter"
      class="w-40"
    />

    <div v-if="issues?.length" class="space-y-3">
      <UiCard v-for="issue in issues" :key="issue.id" padding="sm">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <NuxtLink :to="`/issue/${issue.id}`" class="font-medium hover:underline truncate">
                #{{ issue.id }} {{ issue.title }}
              </NuxtLink>
              <UiBadge>{{ issue.type }}</UiBadge>
              <UiBadge :variant="statusVariant[issue.status] ?? 'default'">{{ issue.status }}</UiBadge>
            </div>
            <p class="text-sm text-toned line-clamp-2">{{ issue.summary }}</p>
            <p v-if="issue.author" class="text-xs text-toned mt-1">
              By {{ issue.author.name || issue.author.email }}
            </p>
            <div v-if="issue.rejectionReason" class="text-xs text-red-600 mt-1">
              Rejected: {{ issue.rejectionReason }}
            </div>
            <div v-if="issue.appealReason" class="text-xs text-yellow-700 mt-2 bg-yellow-50 rounded px-2 py-1">
              Appeal: {{ issue.appealReason }}
            </div>
            <div v-if="issue.infoRequest && !issue.infoResponse" class="text-xs text-blue-700 mt-2 bg-blue-50 rounded px-2 py-1">
              Awaiting response: {{ issue.infoRequest }}
            </div>
            <template v-else-if="issue.infoRequest && issue.infoResponse">
              <div class="text-xs text-gray-500 mt-2 bg-gray-50 rounded px-2 py-1">Asked: {{ issue.infoRequest }}</div>
              <div class="text-xs text-green-700 mt-1 bg-green-50 rounded px-2 py-1">Response: {{ issue.infoResponse }}</div>
            </template>
          </div>
          <div class="flex flex-col gap-1 shrink-0">
            <template v-if="issue.infoRequest && issue.infoResponse && issue.status === 'pending'">
              <UButton
                size="xs"
                color="warning"
                :loading="remodLoading === issue.id"
                @click="triggerRemod(issue.id)"
              >
                Re-moderate
              </UButton>
              <UButton
                size="xs"
                color="primary"
                :loading="actionLoading === issue.id"
                @click="forceApprove(issue.id)"
              >
                Approve
              </UButton>
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                :loading="actionLoading === issue.id"
                @click="forceReject(issue.id)"
              >
                Reject
              </UButton>
            </template>
            <template v-else-if="issue.appealStatus === 'pending'">
              <UButton
                size="xs"
                color="primary"
                :loading="actionLoading === issue.id"
                @click="resolveAppeal(issue.id, 'approved')"
              >
                Grant Appeal
              </UButton>
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                :loading="actionLoading === issue.id"
                @click="resolveAppeal(issue.id, 'denied')"
              >
                Deny Appeal
              </UButton>
            </template>
            <template v-else-if="issue.status === 'pending'">
              <UButton
                size="xs"
                color="primary"
                :loading="actionLoading === issue.id"
                @click="forceApprove(issue.id)"
              >
                Approve
              </UButton>
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                :loading="actionLoading === issue.id"
                @click="forceReject(issue.id)"
              >
                Reject
              </UButton>
            </template>
            <template v-else>
              <UButton
                v-if="issue.status === 'rejected'"
                size="xs"
                color="primary"
                :loading="actionLoading === issue.id"
                @click="forceApprove(issue.id)"
              >
                Override: Approve
              </UButton>
              <UButton
                v-if="issue.status === 'approved'"
                size="xs"
                color="neutral"
                variant="ghost"
                :loading="actionLoading === issue.id"
                @click="forceReject(issue.id)"
              >
                Override: Reject
              </UButton>
            </template>
          </div>
        </div>
      </UiCard>
    </div>
    <UiCard v-else>
      <div class="text-center text-toned text-sm py-4">
        No issues need attention.
      </div>
    </UiCard>
  </div>
</template>
