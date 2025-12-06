<script setup lang="ts">
const { data: terms } = await useAsyncData('/terms', () => queryCollection('content').path('/terms').first())

useSeoMeta({
  title: terms.value?.title || 'Terms of Service - CommunityFix',
  description: terms.value?.description || 'Understand your rights and responsibilities when using CommunityFix to collaborate on community-driven solutions.',
  keywords: 'terms of service, user agreement, community guidelines, CommunityFix, platform rules, legal terms',
  ogTitle: terms.value?.title || 'Terms of Service - CommunityFix',
  ogDescription: terms.value?.description || 'Terms and conditions for using the CommunityFix platform.',
  ogType: 'website',
  twitterCard: 'summary',
  twitterTitle: terms.value?.title || 'Terms of Service - CommunityFix',
  twitterDescription: terms.value?.description || 'Review our terms for collaborating on CommunityFix.',
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
