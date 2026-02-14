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
  description: 'CommunityFix connects neighbors, experts, and funders to co-create solutions for local and global challenges.',
  ogTitle: 'CommunityFix | Community-Driven Solutions Platform',
  ogDescription: 'Join a community where people pool skills, knowledge, and resources to solve real-world issues together.',
  ogType: 'website',
  ogSiteName: 'CommunityFix',
  twitterTitle: 'CommunityFix | Community-Driven Solutions Platform',
  twitterDescription: 'Collaborate on community issues, share solutions, and support impact projects on CommunityFix.',
})

defineOgImageComponent('CommunityFix')
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
