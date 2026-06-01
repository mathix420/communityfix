<script setup lang="ts">
useScript({
  'src': '/umami/script.js',
  'defer': true,
  'async': true,
  'data-website-id': 'a04836b7-0c67-401d-8c45-f072fdc2e221',
}, { trigger: onMounted })

// standard.site (https://standard.site) discovery hint: advertise the
// publication record's AT-URI site-wide so ATmosphere indexers can find it from
// any page. Cached/deduped by useFetch; absent until the publication is published.
const { data: standardSite } = await useFetch<{ uri: string | null }>('/api/standard-site/publication', {
  key: 'standard-site-publication',
  default: () => ({ uri: null }),
})

// SEO Configuration
useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} - CommunityFix` : 'CommunityFix - Community-Driven Solutions Platform'
  },
  link: computed(() => standardSite.value?.uri
    ? [{ rel: 'site.standard.publication', href: standardSite.value.uri }]
    : []),
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

defineOgImage('CommunityFix')
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
