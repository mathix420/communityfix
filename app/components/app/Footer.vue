<script setup lang="ts">
const links = [
  { name: 'Privacy', to: '/privacy' },
  { name: 'Terms', to: '/terms' },
  { name: 'Contact', to: '/contact' },
]

const socials = [
  { name: 'Bluesky', icon: 'fa6-brands:bluesky', url: 'https://bsky.app/profile/communityfix.org' },
  { name: 'GitHub', icon: 'fa6-brands:github', url: 'https://github.com/mathix420/communityfix' },
]
</script>

<template>
  <div class="flex mt-16 select-none w-full items-center">
    <div class="border-t w-full border-gray-200" />
    <p class="font-mono">
      communityfix.org
    </p>
    <div class="border-t w-full border-gray-200" />
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
