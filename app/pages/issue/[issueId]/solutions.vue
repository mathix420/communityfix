<script setup lang="ts">
const { data: issues } = await useFetch('/api/issues')

const latestIssues = computed(() => {
  if (!issues.value) return []
  // clone before reversing to avoid mutating the shared data reference
  return [...issues.value].reverse()
})
</script>

<template>
  <div class="mt-4 flex flex-col max-w-3xl mx-auto gap-4">
    <CardIssue
      v-for="issue in latestIssues"
      :key="issue.id"
      :issue="issue"
    />
  </div>
</template>
