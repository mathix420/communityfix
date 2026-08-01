<script setup lang="ts">
// Quiet "Contributors · History" links at the very bottom of a node overview.
// Deliberately low-key: useful, but not what the page is about. Shared by the
// issue/solution overview and the case-study overview.
interface Person {
  id?: string | null
  name: string
  changes?: number
}

const props = withDefaults(
  defineProps<{
    // Route prefix for the node, e.g. `/issue/42` or `/case-study/7`.
    base: string
    // Optional node kind, forwarded as analytics context.
    kind?: string
    // When supplied, the quiet links become a single node metadata bar.
    createdAt?: string
    updatedAt?: string | null
    owners?: Person[]
    collaborators?: Person[]
  }>(),
  {
    owners: () => [],
    collaborators: () => [],
  },
)

const { track } = useUmami()
const renderedAt = useState<number>(`node-meta-time:${props.base}`, () => Date.now())

function relativeDate(value?: string | null): string {
  if (!value) return ''
  const elapsedMinutes = Math.max(
    0,
    Math.floor((renderedAt.value - new Date(value).getTime()) / 60_000),
  )
  if (elapsedMinutes < 1) return 'just now'
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`
  const hours = Math.floor(elapsedMinutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

const createdLabel = computed(() => relativeDate(props.createdAt))
const updatedLabel = computed(() => relativeDate(props.updatedAt ?? props.createdAt))
const showMetadataBar = computed(() => !!createdLabel.value)

function onClick(tab: 'contributors' | 'history') {
  track('Overview meta link', props.kind ? { tab, kind: props.kind } : { tab })
}

function onContributorsClick() {
  onClick('contributors')
}

function onHistoryClick() {
  onClick('history')
}
</script>

<template>
  <div
    v-if="showMetadataBar"
    class="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6"
  >
    <NuxtLink
      class="-m-2 flex min-w-0 items-center gap-2 rounded-lg p-2 transition-colors hover:bg-gray-100"
      title="View historical versions"
      :to="`${base}/history`"
      @click="onHistoryClick"
    >
      <UIcon class="size-4 shrink-0 text-gray-400" name="lucide:history" />
      <span class="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs font-mono uppercase tracking-wide text-gray-400">
        <span>
          Created {{ createdLabel }}
        </span>
        <span class="text-gray-300">
          ·
        </span>
        <span>
          Edited {{ updatedLabel }}
        </span>
      </span>
    </NuxtLink>
    <NuxtLink
      class="-m-2 flex min-w-0 items-center gap-2 rounded-lg p-2 transition-colors hover:bg-gray-100"
      title="View contributors"
      :to="`${base}/contributors`"
      @click="onContributorsClick"
    >
      <span class="truncate whitespace-nowrap text-sm font-mono text-gray-700">
        Collaborators
      </span>
      <UserAvatarStack ring="muted" :collaborators :linked="false" :max="3" :owners />
    </NuxtLink>
  </div>
  <div v-else class="flex items-center justify-center gap-4 pt-1 text-xs font-mono text-gray-400">
    <NuxtLink
      class="inline-flex items-center gap-1.5 hover:text-gray-600 transition-colors"
      :to="`${base}/contributors`"
      @click="onContributorsClick"
    >
      <UIcon class="size-3.5" name="lucide:users" />
      Contributors
    </NuxtLink>
    <span class="text-gray-300">
      ·
    </span>
    <NuxtLink
      class="inline-flex items-center gap-1.5 hover:text-gray-600 transition-colors"
      :to="`${base}/history`"
      @click="onHistoryClick"
    >
      <UIcon class="size-3.5" name="lucide:history" />
      History
    </NuxtLink>
  </div>
</template>
