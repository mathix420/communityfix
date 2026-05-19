<script setup lang="ts">
defineProps<{
  parent: {
    id: number
    title: string
  }
  label?: string
}>()
</script>

<template>
  <NuxtLink
    :to="`/issue/${parent.id}`"
    class="group flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 transition-colors hover:border-primary hover:bg-primary-50"
  >
    <UIcon
      name="lucide:corner-left-up"
      class="size-4 shrink-0 text-gray-400 group-hover:text-primary"
    />
    <div class="min-w-0">
      <p class="text-xs font-mono uppercase tracking-wide text-gray-400 group-hover:text-primary">
        {{ label || 'Parent issue' }}
      </p>
      <p class="truncate text-sm font-medium text-gray-700 group-hover:text-primary-700">
        <span class="text-gray-400 font-light font-mono mr-1">{{ formatNumber(parent.id) }}</span>
        {{ parent.title }}
      </p>
    </div>
  </NuxtLink>
</template>
