<script setup lang="ts">
const { data: whitepaper } = await useAsyncData('/whitepaper', () => queryCollection('content').path('/whitepaper').first())

useSeoMeta({
  title: whitepaper.value?.title || 'Whitepaper - CommunityFix',
  description: whitepaper.value?.description || 'Explore how CommunityFix empowers community-driven problem solving, incubation, and sustainable development.',
  keywords: 'CommunityFix whitepaper, community fix, sustainable development, community solutions, social impact, collaborative platform, SDGs',
  ogTitle: whitepaper.value?.title || 'CommunityFix Whitepaper',
  ogDescription: whitepaper.value?.description || 'Learn our vision for community-driven solutions, incubation, and measurable impact.',
  ogType: 'article',
  twitterCard: 'summary_large_image',
  twitterTitle: whitepaper.value?.title || 'CommunityFix Whitepaper',
  twitterDescription: whitepaper.value?.description || 'Discover how CommunityFix turns community ideas into sustainable solutions.',
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
