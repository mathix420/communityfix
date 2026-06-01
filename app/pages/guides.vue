<script setup lang="ts">
const { data: guides } = await useAsyncData('guides-list', () => queryCollection('guides').all())

useSeoMeta({
  title: 'Guides',
  description: 'Guides and best practices for using CommunityFix effectively.',
  ogTitle: 'Guides - CommunityFix',
  ogDescription: 'Guides and best practices for using CommunityFix effectively.',
  ogType: 'website',
  twitterCard: 'summary',
  twitterTitle: 'Guides - CommunityFix',
  twitterDescription: 'Guides and best practices for using CommunityFix effectively.',
})

defineOgImage('Editorial', {
  title: 'Guides',
  category: 'Guides',
})
</script>

<template>
  <AppContainer>
    <h1 class="text-3xl font-bold mb-2">
      Guides
    </h1>
    <p class="text-gray-500 mb-8">
      Best practices for using CommunityFix effectively.
    </p>

    <div class="flex flex-col gap-4">
      <NuxtLink
        v-for="guide in guides"
        :key="guide.path"
        :to="guide.path"
        class="block p-4 rounded-lg border border-gray-200 hover:border-gray-400 transition-colors"
      >
        <h2 class="text-lg font-semibold">
          {{ guide.title }}
        </h2>
        <p
          v-if="guide.description"
          class="text-sm text-gray-500 mt-1"
        >
          {{ guide.description }}
        </p>
      </NuxtLink>
    </div>
  </AppContainer>
</template>
