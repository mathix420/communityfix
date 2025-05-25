<script setup lang="ts">
const links = [
  { name: 'Privacy Policy', to: '/privacy-policy' },
  { name: 'Terms of Service', to: '/terms-of-service' },
  { name: 'Contact Us', to: '/contact' },
]

const socials = [
  { name: 'Bluesky', icon: 'ri:bluesky-fill', url: 'https://twitter.com/communityfix' },
  { name: 'GitHub', icon: 'ri:github-fill', url: 'https://github.com/mathix420/communityfix' },
]
</script>

<template>
  <div class="flex mt-16 select-none gap-3 w-full items-center">
    <div class="border-t w-full border-gray-200" />
    <p class="font-mono">
      communityfix.org
    </p>
    <div class="border-t w-full border-gray-200" />
  </div>
  <footer class="flex w-full justify-between items-center p-6 *:w-full">
    <UButton
      target="_blank"
      to="https://github.com/mathix420/communityfix"
      variant="link"
      color="neutral"
    >
      Published under <span class="font-bold">MIT License</span>
    </UButton>

    <!-- links -->
    <nav class="flex gap-4 justify-center">
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
    <nav class="flex gap-4 justify-end items-center">
      <UButton
        v-for="social in socials"
        :key="social.name"
        :to="social.url"
        :icon="social.icon"
        target="_blank"
        variant="link"
        color="neutral"
      />
    </nav>
  </footer>
</template>
