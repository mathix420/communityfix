<script setup lang="ts">
useScript({
  'src': '/umami/script.js',
  'defer': true,
  'async': true,
  'data-website-id': 'a04836b7-0c67-401d-8c45-f072fdc2e221',
}, { trigger: onMounted })

// SEO Configuration
useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} - CommunityFix` : 'CommunityFix - Community-Driven Solutions Platform'
  },
})

useSeoMeta({
  description: 'CommunityFix is a community-driven platform for sharing skills, knowledge, and collaborative solutions to local and global challenges.',
  ogTitle: 'CommunityFix - Community-Driven Solutions Platform',
  ogDescription: 'Join our community to share skills, knowledge, and work together on solutions to local and global challenges.',
  ogImage: '/og-image.png',
  ogType: 'website',
  ogSiteName: 'CommunityFix',
  twitterCard: 'summary_large_image',
  twitterTitle: 'CommunityFix - Community-Driven Solutions Platform',
  twitterDescription: 'Join our community to share skills, knowledge, and work together on solutions to local and global challenges.',
  twitterImage: '/og-image.png',
})
</script>

<template>
  <Html>
    <Body class="grainy">
      <UApp>
        <AppHeader />
        <NuxtPage />
        <AppFooter />
      </UApp>
    </Body>
  </Html>
</template>
