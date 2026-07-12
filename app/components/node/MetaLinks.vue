<script setup lang="ts">
// Quiet "Contributors · History" links at the very bottom of a node overview.
// Deliberately low-key: useful, but not what the page is about. Shared by the
// issue/solution overview and the case-study overview.
const props = defineProps<{
  // Route prefix for the node, e.g. `/issue/42` or `/case-study/7`.
  base: string
  // Optional node kind, forwarded as analytics context.
  kind?: string
}>()

const { track } = useUmami()

function onClick(tab: 'contributors' | 'history') {
  track('Overview meta link', props.kind ? { tab, kind: props.kind } : { tab })
}
</script>

<template>
  <div class="flex items-center justify-center gap-4 pt-1 text-xs font-mono text-gray-400">
    <NuxtLink
      class="inline-flex items-center gap-1.5 hover:text-gray-600 transition-colors"
      :to="`${base}/contributors`"
      @click="onClick('contributors')"
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
      @click="onClick('history')"
    >
      <UIcon class="size-3.5" name="lucide:history" />
      History
    </NuxtLink>
  </div>
</template>
