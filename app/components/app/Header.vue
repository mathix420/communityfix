<template>
  <header class="flex sm:text-lg z-10 fixed top-0 inset-x-0 bg-white/5 backdrop-blur-md px-4 py-2">
    <AppLogo />
    <div class="ml-auto font-mono flex gap-2">
      <AuthState v-slot="{ loggedIn, user }">
        <NuxtLink
          v-if="loggedIn"
          to="/settings"
          class="interactive-underline"
          data-umami-event="Nav settings"
        >
          {{ user?.name || user?.email }}
        </NuxtLink>
        <template v-else>
          <NuxtLink
            to="/login"
            class="interactive-underline"
            data-umami-event="Nav login"
          >
            login
          </NuxtLink>
          <NuxtLink
            to="/register"
            class="interactive-underline"
            data-umami-event="Nav register"
          >
            register
          </NuxtLink>
        </template>
      </AuthState>
    </div>
  </header>
</template>
