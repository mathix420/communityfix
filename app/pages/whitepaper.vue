<script setup lang="ts">
const { data: whitepaper } = await useAsyncData(() => queryCollection('content').path('/whitepaper').first())

useSeoMeta({
  title: whitepaper.value?.title,
  description: whitepaper.value?.description,
})
</script>

<template>
  <AppContainer>
    <ContentRenderer
      v-if="whitepaper"
      :value="whitepaper"
      :class="prose"
    />
    <div v-else>
      Not found
    </div>
  </AppContainer>
</template>
