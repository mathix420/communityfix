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

// Optional frontmatter; flows into Article schema only when declared.
const guideMeta = computed(() => page.value as
  | { datePublished?: string, dateModified?: string, date?: string, author?: string }
  | null)

const guideUrl = computed(() => `${SITE_URL}/guide/${slug}`)

useJsonLd([
  breadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Guides', url: `${SITE_URL}/guides` },
    { name: page.value?.title || 'Guide', url: guideUrl.value },
  ]),
  articleSchema({
    title: page.value?.title || 'Guide',
    description: page.value?.description || undefined,
    url: guideUrl.value,
    datePublished: guideMeta.value?.datePublished || guideMeta.value?.date || undefined,
    dateModified: guideMeta.value?.dateModified || undefined,
    authorName: guideMeta.value?.author || undefined,
  }),
])
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
