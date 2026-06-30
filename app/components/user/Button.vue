<script setup lang="ts">
defineProps<{
  authorId?: string | null
  name: string
}>()
</script>

<template>
  <NuxtLink
    v-if="authorId"
    class="inline-flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-md shrink-0 hover:bg-gray-100 transition-colors"
    :to="`/user/${authorId}`"
  >
    <img
      alt="Author Avatar"
      class="size-5 rounded-full shrink-0"
      :src="`https://api.dicebear.com/9.x/glass/svg?seed=${authorId}`"
    >
    <span class="whitespace-nowrap text-gray-700 font-mono">
      {{ name }}
    </span>
  </NuxtLink>
  <span v-else class="inline-flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-md shrink-0">
    <img
      alt="Author Avatar"
      class="size-5 rounded-full shrink-0"
      :src="`https://api.dicebear.com/9.x/glass/svg?seed=${name}`"
    >
    <span class="whitespace-nowrap text-gray-700 font-mono">
      {{ name }}
    </span>
  </span>
</template>
