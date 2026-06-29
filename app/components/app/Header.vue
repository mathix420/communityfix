<script setup lang="ts">
const { track } = useUmami()
const { hasAttention } = useDashboardAttention()
</script>

<template>
  <header class="flex sm:text-lg z-[99] fixed top-0 inset-x-0 bg-white/5 backdrop-blur-md px-4 py-2">
    <AppLogo />
    <div class="ml-auto font-mono flex items-center gap-2">
      <AuthState v-slot="{ loggedIn, user }">
        <template v-if="loggedIn">
          <NuxtLink
            to="/dashboard"
            class="relative interactive-underline"
            @click="track('Nav dashboard')"
          >
            {{ user?.name || user?.email }}
            <span
              v-if="hasAttention"
              class="absolute -top-0.5 -right-2 size-2 rounded-full bg-primary-600 ring-2 ring-white"
              title="You have updates in your dashboard"
            />
          </NuxtLink>
        </template>
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
