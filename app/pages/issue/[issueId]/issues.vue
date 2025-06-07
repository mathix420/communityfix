<script setup lang="ts">
const { data: issues } = await useFetch('/api/issues')
</script>

<template>
  <div class="mt-4 flex flex-col max-w-3xl mx-auto gap-4">
    <CardIssue
      v-for="issue in issues"
      :key="issue.id"
      :issue="issue"
    />
  </div>
</template>
