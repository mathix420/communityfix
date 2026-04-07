<script setup lang="ts">
const { track } = useUmami()
</script>

<template>
  <header class="flex sm:text-lg z-[99] fixed top-0 inset-x-0 bg-white/5 backdrop-blur-md px-4 py-2">
    <AppLogo />
    <div class="ml-auto font-mono flex gap-2">
      <AuthState v-slot="{ loggedIn, user }">
        <NuxtLink
          v-if="loggedIn"
          to="/settings"
          class="interactive-underline"
          @click="track('Nav settings')"
        >
          {{ user?.name || user?.email }}
        </NuxtLink>
        <template v-else>
          <NuxtLink
            to="/login"
            class="interactive-underline"
            @click="track('Nav login')"
          >
            login
          </NuxtLink>
          <NuxtLink
            to="/register"
            class="interactive-underline"
            @click="track('Nav register')"
          >
            register
          </NuxtLink>
        </template>
      </AuthState>
    </div>
  </header>
</template>
