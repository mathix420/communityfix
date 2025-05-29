<script setup lang="ts">
const { data: privacy } = await useAsyncData('/privacy', () => queryCollection('content').path('/privacy').first())

useSeoMeta({
  title: privacy.value?.title,
  description: privacy.value?.description,
})
</script>

<template>
  <AppContainer>
    <ContentRenderer
      v-if="privacy"
      :value="privacy"
      :class="prose"
    />
    <div v-else>
      Not found
    </div>
  </AppContainer>
</template>
