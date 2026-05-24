<script setup lang="ts">
const { data: stats } = await useFetch('/api/admin/stats')
const { data: recentLogs } = await useFetch('/api/admin/logs', { query: { limit: 10 } })

const statusVariant: Record<string, 'default' | 'warning' | 'success' | 'primary'> = {
  auto_resolved: 'default',
  needs_review: 'warning',
  reviewed: 'success',
  overridden: 'primary',
}

function formatTime(date: string) {
  return new Date(date).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <UiCard padding="sm">
        <p class="text-xs text-toned uppercase tracking-wide">Pending Reviews</p>
        <p class="text-2xl font-semibold mt-1">{{ stats?.pendingReviews ?? 0 }}</p>
      </UiCard>
      <UiCard padding="sm">
        <p class="text-xs text-toned uppercase tracking-wide">Issue Appeals</p>
        <p class="text-2xl font-semibold mt-1">{{ stats?.issueAppeals ?? 0 }}</p>
      </UiCard>
      <UiCard padding="sm">
        <p class="text-xs text-toned uppercase tracking-wide">Ban Appeals</p>
        <p class="text-2xl font-semibold mt-1">{{ stats?.banAppeals ?? 0 }}</p>
      </UiCard>
      <UiCard padding="sm">
        <p class="text-xs text-toned uppercase tracking-wide">Total Logs</p>
        <p class="text-2xl font-semibold mt-1">{{ stats?.totalLogs ?? 0 }}</p>
      </UiCard>
    </div>

    <div>
      <h3 class="text-sm font-medium text-toned mb-3">Recent Activity</h3>
      <UiCard padding="none">
        <div v-if="recentLogs?.logs?.length" class="divide-y divide-gray-100">
          <div
            v-for="log in recentLogs.logs"
            :key="log.id"
            class="flex items-center gap-3 px-4 py-3 text-sm"
          >
            <span class="text-xs text-toned whitespace-nowrap">{{ formatTime(log.createdAt) }}</span>
            <UiBadge>{{ log.type }}</UiBadge>
            <span class="font-medium">{{ log.action }}</span>
            <NuxtLink
              v-if="log.issue"
              :to="`/issue/${log.issue.id}`"
              class="text-toned hover:text-black truncate"
            >
              #{{ log.issue.id }} {{ log.issue.title }}
            </NuxtLink>
            <span class="ml-auto">
              <UiBadge :variant="statusVariant[log.status] ?? 'default'">{{ log.status }}</UiBadge>
            </span>
          </div>
        </div>
        <div v-else class="px-4 py-8 text-center text-toned text-sm">
          No activity yet.
        </div>
      </UiCard>
    </div>
  </div>
</template>
