<script setup lang="ts">
defineProps<{
  text?: string
}>()
</script>

<template>
  <div class="flex items-center gap-3 text-[10px] font-mono text-gray-400 uppercase tracking-widest">
    <span class="h-px flex-1 bg-gray-200" />
    <span v-if="text || $slots.default">
      <slot>{{ text }}</slot>
    </span>
    <span class="h-px flex-1 bg-gray-200" />
  </div>
</template>
