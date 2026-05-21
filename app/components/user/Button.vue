<script setup lang="ts">
// Avatar + name affordance used at the footer of every card. When `authorId`
// is present, links to the public profile; otherwise renders the same chip as
// a non-interactive span so anonymous authors don't shift the layout.
defineProps<{
  authorId?: string | null
  name: string
}>()
</script>

<template>
  <component
    :is="authorId ? 'NuxtLink' : 'span'"
    :to="authorId ? `/user/${authorId}` : undefined"
    class="inline-flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-md shrink-0"
    :class="authorId && 'hover:bg-gray-100 transition-colors'"
  >
    <img
      :src="`https://api.dicebear.com/9.x/glass/svg?seed=${name}`"
      alt="Author Avatar"
      class="size-5 rounded-full shrink-0"
    >
    <span class="whitespace-nowrap text-gray-700 font-mono">
      {{ name }}
    </span>
  </component>
</template>
