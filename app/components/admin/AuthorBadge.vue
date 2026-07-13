<script setup lang="ts">
import { formatRelative } from '~/utils/relative-time'

// Compact author summary for queue cards — trust score + history at a glance,
// so the moderator doesn't have to click through to the user profile.
defineProps<{
  author: {
    id: string
    name: string | null
    email: string
    trustScore?: number
    rejected?: number
    approved?: number
    createdAt?: string
  } | null
  // When set, surfaces age (e.g. "responded 2h ago").
  timestampLabel?: string
  timestamp?: string | null
}>()

function isNewAccount(createdAt?: string) {
  if (!createdAt) return false
  return Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
}
</script>

<template>
  <div v-if="author" class="text-xs text-toned flex flex-wrap items-center gap-x-2 gap-y-0.5">
    <NuxtLink class="hover:text-black font-medium" :to="`/admin/users/${author.id}`">
      {{ author.name || author.email }}
    </NuxtLink>
    <span
      v-if="author.trustScore != null"
      class="inline-flex items-center gap-0.5 font-mono"
      :class="author.trustScore < 0 ? 'text-red-600' : 'text-gray-500'"
      :title="`Trust score: ${author.trustScore}`"
    >
      <UIcon class="size-3" name="lucide:shield" />
      {{ author.trustScore }}
    </span>
    <span
      v-if="(author.rejected ?? 0) > 0"
      class="inline-flex items-center gap-0.5 text-red-600"
      :title="`${author.rejected} prior rejection${author.rejected === 1 ? '' : 's'}`"
    >
      <UIcon class="size-3" name="lucide:x-circle" />
      {{ author.rejected }}
    </span>
    <span
      v-if="(author.approved ?? 0) > 0"
      class="inline-flex items-center gap-0.5 text-gray-500"
      :title="`${author.approved} prior approval${author.approved === 1 ? '' : 's'}`"
    >
      <UIcon class="size-3" name="lucide:check" />
      {{ author.approved }}
    </span>
    <span
      v-if="isNewAccount(author.createdAt)"
      class="text-gray-500 font-medium"
      title="Account less than 7 days old"
    >
      new
    </span>
    <span v-if="timestamp">
      · {{ timestampLabel ? `${timestampLabel} ` : '' }}{{ formatRelative(timestamp) }}
    </span>
  </div>
</template>
