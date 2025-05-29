<script setup lang="ts">
const route = useRoute()
const issueId = computed(() => route.params.issueId)
const { data: issue } = await useFetch(() => `/api/issue/${issueId.value}`)

const tabs = [
  { name: 'Details', path: `/issue/${issueId.value}` },
  { name: 'Issues', path: `/issue/${issueId.value}/issues` },
  { name: 'Solutions', path: `/issue/${issueId.value}/solutions` },
  { name: 'Studies', path: `/issue/${issueId.value}/studies` },
  { name: 'Funding', path: `/issue/${issueId.value}/funding` },
]
</script>

<template>
  <AppContainer v-if="issue">
    <div class="flex items-center justify-between mb-4">
      <h1 :class="underlinedTitle">
        {{ issue.title }}
      </h1>
      <p class="text-5xl text-black/10 font-mono">
        #{{ issue.id.toString().padStart(5, '0') }}
      </p>
    </div>
    <p class="text-toned text-lg my-8">
      {{ issue.description }}
    </p>

    <UiNavTabs :tabs="tabs" />

    <NuxtPage />
  </AppContainer>
  <AppContainer v-else>
    <div class="flex items-center justify-center h-screen">
      <p class="text-toned text-lg">
        Loading...
      </p>
    </div>
  </AppContainer>
</template>
