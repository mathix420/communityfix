<script setup lang="ts">
const links = [
  { name: 'Whitepaper', to: '/whitepaper' },
  { name: 'Privacy', to: '/privacy' },
  { name: 'Terms', to: '/terms' },
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
</script>

<template>
  <div class="flex mt-16 select-none gap-1 w-full items-center">
    <hr class="w-full text-gray-200 mt-1">
    <p class="font-mono">
      communityfix.org
    </p>
    <hr class="w-full text-gray-200 mt-1">
  </div>
  <footer class="flex w-full sm:flex-row flex-col-reverse justify-between gap-3 items-center p-6 *:w-full">
    <UButton
      target="_blank"
      to="https://github.com/mathix420/communityfix"
      variant="link"
      color="neutral"
      class="sm:justify-start justify-center"
    >
      Published under <span class="font-bold">MIT License</span>
    </UButton>

    <!-- links -->
    <nav class="flex gap-3 justify-center">
      <UButton
        v-for="link in links"
        :key="link.name"
        :to="link.to"
        variant="link"
        color="neutral"
      >
        {{ link.name }}
      </UButton>
    </nav>

    <!-- socials -->
    <nav class="flex gap-4 sm:justify-end justify-center items-center">
      <UButton
        v-for="social in socials"
        :key="social.name"
        :to="social.url"
        :icon="social.icon"
        target="_blank"
        variant="link"
        size="xl"
        color="neutral"
      />
    </nav>
  </footer>
</template>
