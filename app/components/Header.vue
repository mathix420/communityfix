<template>
  <header class="flex sm:text-lg z-10 fixed top-0 inset-x-0 bg-white/5 backdrop-blur-md px-4 py-2">
    <Logo />
    <div class="ml-auto font-mono flex gap-2">
      <NuxtLink
        to="/login"
        class="interactive-underline"
      >
        login
      </NuxtLink>
      <NuxtLink
        to="/register"
        class="interactive-underline"
      >
        register
      </NuxtLink>
    </div>
  </header>
</template>
