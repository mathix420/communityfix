<script setup lang="ts">
definePageMeta({ middleware: ['admin'] })

const tabs = [
  { name: 'Overview', path: '/admin' },
  { name: 'Audit Logs', path: '/admin/logs' },
  { name: 'Issues', path: '/admin/issues' },
]
</script>

<template>
  <AppContainer>
    <UiPageHeader title="Admin" description="Automated decisions, appeals, and moderation." />
    <UiNavTabs :tabs="tabs" />
    <NuxtPage />
  </AppContainer>
</template>
