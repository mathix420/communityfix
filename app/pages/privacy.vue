<script setup lang="ts">
const { data: privacy } = await useAsyncData('/privacy', () => queryCollection('content').path('/privacy').first())

useSeoMeta({
  title: privacy.value?.title || 'Privacy Policy - CommunityFix',
  description: privacy.value?.description || 'See how CommunityFix protects your data, respects your privacy, and keeps your community contributions secure.',
  keywords: 'privacy policy, data protection, user privacy, CommunityFix, information security, GDPR compliance',
  ogTitle: privacy.value?.title || 'Privacy Policy - CommunityFix',
  ogDescription: privacy.value?.description || 'Our commitment to privacy, transparency, and responsible data handling on CommunityFix.',
  ogType: 'website',
  twitterCard: 'summary',
  twitterTitle: privacy.value?.title || 'Privacy Policy - CommunityFix',
  twitterDescription: privacy.value?.description || 'Learn how we safeguard your data and privacy on CommunityFix.',
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
