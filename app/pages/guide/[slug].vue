<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug as string

const { data: page } = await useAsyncData(`guides-${slug}`, () => queryCollection('guides').path(`/guide/${slug}`).first())

useSeoMeta({
  title: page.value?.title || 'Guides - CommunityFix',
  description: page.value?.description || 'Guides and best practices for using CommunityFix.',
  ogTitle: page.value?.title || 'Guides - CommunityFix',
  ogDescription: page.value?.description || 'Guides and best practices for using CommunityFix.',
  ogType: 'article',
  twitterCard: 'summary',
  twitterTitle: page.value?.title || 'Guides - CommunityFix',
  twitterDescription: page.value?.description || 'Guides and best practices for using CommunityFix.',
})

defineOgImage('Editorial', {
  title: page.value?.title || 'Guides',
  category: 'Guide',
})
</script>

<template>
  <AppContainer>
    <!-- @vue-ignore Nuxt Content's ContentRenderer infers slot props as never; suppressed until upstream types are fixed -->
    <ContentRenderer
      v-if="page"
      :value="page"
      class="prose"
    />
    <div v-else>
      Not found
    </div>
  </AppContainer>
</template>
