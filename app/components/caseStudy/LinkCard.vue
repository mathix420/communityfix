<script setup lang="ts">
// A labeled card listing external links ({ url, title }) — the Sources and
// Links sections of a case study render identically apart from icon + label, so
// they share this. Renders nothing when there are no items.
defineProps<{
  icon: string
  label: string
  items: { url: string; title?: string | null }[]
}>()
</script>

<template>
  <div v-if="items.length" class="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden">
    <div class="flex items-center gap-2 p-4 sm:p-6 border-b border-gray-200">
      <UIcon class="size-4 text-gray-400" :name="icon" />
      <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
        {{ label }}
      </p>
      <span class="text-xs font-mono text-gray-400">
        {{ items.length }}
      </span>
    </div>
    <ul class="divide-y divide-gray-200 bg-white">
      <li v-for="(item, i) in items" :key="i">
        <a
          class="flex items-center gap-3 px-4 py-2.5 sm:px-6 hover:bg-gray-50 transition-colors min-w-0"
          rel="nofollow noopener noreferrer"
          target="_blank"
          :href="item.url"
        >
          <UIcon class="size-3.5 text-gray-400 shrink-0" name="lucide:external-link" />
          <span class="truncate text-sm text-primary-700">
            {{ item.title || item.url }}
          </span>
        </a>
      </li>
    </ul>
  </div>
</template>
