<script setup lang="ts">
const { track } = useUmami()

const links = [
  { name: 'Whitepaper', to: '/whitepaper' },
  { name: 'Privacy', to: '/privacy' },
  { name: 'Terms', to: '/terms' },
  { name: 'LLMs', to: '/llms.txt', external: true },
]

const socials = [
  {
    name: 'Umami Analytics',
    icon: 'simple-icons:umami',
    url: 'https://cloud.umami.is/share/gv1yqQGUVb1AsbKy/communityfix.org',
  },
  { name: 'Bluesky', icon: 'fa6-brands:bluesky', url: 'https://bsky.app/profile/communityfix.org' },
  { name: 'GitHub', icon: 'fa6-brands:github', url: 'https://github.com/mathix420/communityfix' },
]

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="flex mt-16 select-none gap-1 w-full items-center">
    <hr class="w-full text-gray-200 mt-1">
    <NuxtLink class="font-mono" to="/" @click="scrollToTop">
      communityfix.org
    </NuxtLink>
    <hr class="w-full text-gray-200 mt-1">
  </div>
  <footer class="flex w-full sm:flex-row flex-col-reverse justify-between gap-3 items-center p-6 *:w-full">
    <UButton
      class="sm:justify-start justify-center"
      color="neutral"
      target="_blank"
      to="https://github.com/mathix420/communityfix"
      variant="link"
      @click="track('Footer license link')"
    >
      Published under
      <span class="font-bold">
        MIT License
      </span>
    </UButton>
    <nav class="flex flex-wrap gap-x-3 gap-y-1 justify-center">
      <UButton
        v-for="link in links"
        :key="link.name"
        color="neutral"
        variant="link"
        :external="link.external"
        :target="link.external ? '_blank' : undefined"
        :to="link.to"
        @click="track('Footer nav', { page: link.name })"
      >
        {{ link.name }}
      </UButton>
    </nav>
    <nav class="flex gap-4 sm:justify-end justify-center items-center">
      <UButton
        v-for="social in socials"
        :key="social.name"
        color="neutral"
        size="xl"
        target="_blank"
        variant="link"
        :icon="social.icon"
        :to="social.url"
        @click="track('Footer social', { name: social.name })"
      />
    </nav>
  </footer>
</template>
