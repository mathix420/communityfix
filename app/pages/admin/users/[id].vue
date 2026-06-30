<script setup lang="ts">
const route = useRoute()
const userId = computed(() => String(route.params.id))

const { data, refresh } = await useFetch(() => `/api/admin/users/${userId.value}`)
const { run, isPending, lastError } = useAdminAction()

const banOpen = ref(false)
const banReason = ref('')
const banDays = ref(30)

const isBanned = computed(() => {
  const u = data.value?.user
  return !!u?.bannedUntil && new Date(u.bannedUntil) > new Date()
})

async function unban() {
  const result = await run(`unban-${userId.value}`, () =>
    $fetch(`/api/admin/users/${userId.value}/unban`, {
      method: 'POST',
      body: { reason: 'Admin lifted ban' },
    }),
  )
  if (result) await refresh()
}

async function denyAppeal() {
  const result = await run(`deny-${userId.value}`, () =>
    $fetch(`/api/admin/users/${userId.value}/ban-appeal`, {
      method: 'PATCH',
      body: { status: 'denied' },
    }),
  )
  if (result) await refresh()
}

async function grantAppeal() {
  const result = await run(`grant-${userId.value}`, () =>
    $fetch(`/api/admin/users/${userId.value}/ban-appeal`, {
      method: 'PATCH',
      body: { status: 'approved' },
    }),
  )
  if (result) await refresh()
}

async function submitBan() {
  if (banReason.value.trim().length < 5) return
  const result = await run(`ban-${userId.value}`, () =>
    $fetch(`/api/admin/users/${userId.value}/ban`, {
      method: 'POST',
      body: { reason: banReason.value.trim(), days: banDays.value },
    }),
  )
  if (result) {
    banOpen.value = false
    banReason.value = ''
    banDays.value = 30
    await refresh()
  }
}

function formatDate(date: string | null | undefined) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
function formatTime(date: string) {
  const d = new Date(date)
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const statusVariant: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
}
</script>

<template>
  <div v-if="data" class="space-y-6">
    <NuxtLink
      class="font-mono text-[11px] text-gray-500 hover:text-black uppercase tracking-widest inline-flex items-center gap-1"
      to="/admin/users"
    >
      <UIcon class="size-3" name="lucide:chevron-left" />
      Back to users
    </NuxtLink>
    <UiCard>
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="text-lg font-semibold">
              {{ data.user.name || data.user.email }}
            </h2>
            <UiBadge v-if="isBanned" variant="error">
              banned
            </UiBadge>
            <UiBadge v-else-if="data.user.banAppealStatus === 'pending'" variant="warning">
              appeal pending
            </UiBadge>
          </div>
          <p class="text-sm text-toned">
            {{ data.user.email }}
          </p>
          <p class="text-[11px] text-toned font-mono mt-0.5">
            {{ data.user.id }}
          </p>
          <p v-if="data.user.headline" class="text-sm mt-2">
            {{ data.user.headline }}
          </p>
          <p v-if="data.user.location" class="text-xs text-toned mt-1">
            <UIcon class="inline size-3" name="lucide:map-pin" />
            {{ data.user.location }}
          </p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
            <div>
              <p class="font-mono text-[11px] uppercase tracking-widest text-gray-500">
                Trust score
              </p>
              <p
                class="text-lg font-mono font-medium mt-0.5"
                :class="data.user.trustScore < 0 ? 'text-red-600' : ''"
              >
                {{ data.user.trustScore }}
              </p>
            </div>
            <div>
              <p class="font-mono text-[11px] uppercase tracking-widest text-gray-500">
                Approved
              </p>
              <p class="text-lg font-mono font-medium mt-0.5">
                {{ data.stats.approved ?? 0 }}
              </p>
            </div>
            <div>
              <p class="font-mono text-[11px] uppercase tracking-widest text-gray-500">
                Pending
              </p>
              <p class="text-lg font-mono font-medium mt-0.5">
                {{ data.stats.pending ?? 0 }}
              </p>
            </div>
            <div>
              <p class="font-mono text-[11px] uppercase tracking-widest text-gray-500">
                Rejected
              </p>
              <p
                class="text-lg font-mono font-medium mt-0.5"
                :class="(data.stats.rejected ?? 0) > 0 ? 'text-red-600' : ''"
              >
                {{ data.stats.rejected ?? 0 }}
              </p>
            </div>
          </div>
          <p class="text-[11px] text-toned mt-3">
            Joined {{ formatDate(data.user.createdAt) }}
            <span v-if="data.user.provider">
              · via {{ data.user.provider }}
            </span>
          </p>
        </div>
        <div class="flex flex-col gap-1.5 shrink-0">
          <UButton
            v-if="isBanned"
            color="primary"
            size="sm"
            :disabled="isPending(`unban-${userId}`)"
            :loading="isPending(`unban-${userId}`)"
            @click="unban"
          >
            Unban
          </UButton>
          <UButton
            v-else
            color="error"
            size="sm"
            variant="soft"
            @click="() => {
              banOpen = true
            }"
          >
            Ban user
          </UButton>
          <template v-if="data.user.banAppealStatus === 'pending'">
            <UButton
              color="primary"
              size="sm"
              variant="outline"
              :disabled="isPending(`grant-${userId}`)"
              :loading="isPending(`grant-${userId}`)"
              @click="grantAppeal"
            >
              Grant appeal
            </UButton>
            <UButton
              color="neutral"
              size="sm"
              variant="ghost"
              :disabled="isPending(`deny-${userId}`)"
              :loading="isPending(`deny-${userId}`)"
              @click="denyAppeal"
            >
              Deny appeal
            </UButton>
          </template>
        </div>
      </div>
      <div v-if="isBanned" class="mt-4 bg-red-50 rounded-lg p-3 text-xs">
        <p class="font-medium text-red-800">
          Banned until {{ formatDate(data.user.bannedUntil) }}
        </p>
        <p v-if="data.user.banReason" class="text-red-700 mt-1">
          Reason: {{ data.user.banReason }}
        </p>
        <p v-if="data.user.banAppealReason" class="mt-2 text-gray-700">
          Appeal: {{ data.user.banAppealReason }}
        </p>
      </div>
      <p v-if="lastError" class="text-xs text-red-600 mt-3">
        {{ lastError }}
      </p>
    </UiCard>
    <!-- Recent issues -->
    <section v-if="data.recentIssues.length">
      <div class="mb-3 flex items-center gap-2">
        <h3 class="font-mono text-sm uppercase tracking-widest text-gray-700">
          Recent submissions
        </h3>
        <span class="font-mono text-[10px] text-gray-400 tracking-widest">
          · {{ data.recentIssues.length }}
        </span>
      </div>
      <UiCard padding="none">
        <div class="divide-y divide-gray-100">
          <NuxtLink
            v-for="i in data.recentIssues"
            :key="i.id"
            class="block px-4 py-2.5 hover:bg-gray-50/60"
            :to="`/issue/${i.id}`"
          >
            <div class="flex items-center gap-2">
              <span class="font-mono text-[11px] text-toned w-12">
                #{{ i.id }}
              </span>
              <UiBadge>
                {{ i.type }}
              </UiBadge>
              <UiBadge :variant="statusVariant[i.status] ?? 'default'">
                {{ i.status }}
              </UiBadge>
              <UiBadge v-if="i.appealStatus === 'pending'" variant="warning">
                appeal
              </UiBadge>
              <span class="text-sm truncate flex-1">
                {{ i.title }}
              </span>
              <span class="text-[11px] text-toned shrink-0">
                {{ formatTime(i.createdAt) }}
              </span>
            </div>
            <p v-if="i.rejectionReason" class="text-xs text-red-600 mt-1 ml-14 line-clamp-1">
              {{ i.rejectionReason }}
            </p>
          </NuxtLink>
        </div>
      </UiCard>
    </section>
    <!-- Recent case studies -->
    <section v-if="data.recentCaseStudies.length">
      <div class="mb-3 flex items-center gap-2">
        <h3 class="font-mono text-sm uppercase tracking-widest text-gray-700">
          Recent case studies
        </h3>
        <span class="font-mono text-[10px] text-gray-400 tracking-widest">
          · {{ data.recentCaseStudies.length }}
        </span>
      </div>
      <UiCard padding="none">
        <div class="divide-y divide-gray-100">
          <div v-for="c in data.recentCaseStudies" :key="c.id" class="px-4 py-2.5">
            <div class="flex items-center gap-2">
              <UiBadge :variant="statusVariant[c.status] ?? 'default'">
                {{ c.status }}
              </UiBadge>
              <UiBadge>
                {{ c.outcome }}
              </UiBadge>
              <NuxtLink
                v-if="c.solution"
                class="text-sm hover:underline truncate flex-1"
                :to="`/issue/${c.solution.id}`"
              >
                on #{{ c.solution.id }} {{ c.solution.title }}
              </NuxtLink>
              <span class="text-[11px] text-toned shrink-0">
                {{ formatTime(c.createdAt) }}
              </span>
            </div>
            <p class="text-xs text-toned mt-0.5">
              {{ c.locationName }}
            </p>
          </div>
        </div>
      </UiCard>
    </section>
    <!-- Recent moderation activity -->
    <section v-if="data.recentLogs.length">
      <div class="mb-3 flex items-center gap-2">
        <h3 class="font-mono text-sm uppercase tracking-widest text-gray-700">
          Moderation history
        </h3>
        <span class="font-mono text-[10px] text-gray-400 tracking-widest">
          · {{ data.recentLogs.length }}
        </span>
      </div>
      <UiCard padding="none">
        <div class="divide-y divide-gray-100">
          <div v-for="log in data.recentLogs" :key="log.id" class="px-4 py-2 text-sm">
            <div class="flex items-center gap-2">
              <span class="text-[11px] text-toned tabular-nums w-16">
                {{ formatTime(log.createdAt) }}
              </span>
              <UiBadge>
                {{ log.action }}
              </UiBadge>
              <span class="text-xs truncate flex-1">
                {{ log.reason }}
              </span>
              <NuxtLink
                v-if="log.issue"
                class="text-[11px] text-toned hover:text-black"
                :to="`/issue/${log.issue.id}`"
              >
                #{{ log.issue.id }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </UiCard>
    </section>
    <!-- Ban modal -->
    <UModal v-model:open="banOpen">
      <template #content>
        <div class="p-4 space-y-3">
          <h3 class="font-medium">
            Ban {{ data.user.name || data.user.email }}
          </h3>
          <p class="text-sm text-toned">
            The user won't be able to log in or submit while banned. They can appeal once.
          </p>
          <label class="block">
            <span class="text-xs font-medium text-toned">
              Reason (shown to user)
            </span>
            <UTextarea
              v-model="banReason"
              autofocus
              class="mt-1 w-full"
              placeholder="What did they do?"
              :rows="3"
            />
          </label>
          <label class="block">
            <span class="text-xs font-medium text-toned">
              Duration (days)
            </span>
            <UInput v-model="banDays" class="mt-1 w-32" max="3650" min="1" type="number" />
          </label>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="() => {
                banOpen = false
              }"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :disabled="banReason.trim().length < 5"
              :loading="isPending(`ban-${userId}`)"
              @click="submitBan"
            >
              Ban for {{ banDays }} day{{ banDays === 1 ? '' : 's' }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
