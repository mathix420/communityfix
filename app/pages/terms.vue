<script setup lang="ts">
const { data: terms } = await useAsyncData(() => queryCollection('content').path('/terms').first())

useSeoMeta({
  title: terms.value?.title,
  description: terms.value?.description,
})
</script>

<template>
  <AppContainer>
    <ContentRenderer
      v-if="terms"
      :value="terms"
      :class="prose"
    />
    <div v-else>
      Not found
    </div>
  </AppContainer>
</template>
