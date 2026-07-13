<script setup lang="ts">
// Small "← back" link used at the top of a node's meta pages (Contributors /
// History) where there's no tab bar to navigate back with.
defineProps<{ to: string; label?: string }>()
</script>

<template>
  <NuxtLink
    class="inline-flex items-center gap-1.5 text-xs font-mono text-gray-400 hover:text-gray-600 transition-colors"
    :to="to"
  >
    <UIcon class="size-3.5" name="lucide:arrow-left" />
    {{ label ?? 'Back' }}
  </NuxtLink>
</template>
