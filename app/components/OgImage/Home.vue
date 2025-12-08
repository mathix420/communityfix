<script setup lang="ts">
// inherited attrs can mess up the satori parser
defineOptions({
  inheritAttrs: false,
})
</script>

<template>
  <div class="h-full w-full flex flex-col items-center justify-center bg-gray-50 text-center">
    <h1 style="font-family: Oswald" class="text-9xl font-normal text-black/80 underline decoration-blue-500 mb-10">
      communityfix.org
    </h1>
    <p style="font-family: Oswald" class="text-6xl text-black/80">
      Let's put our skills to work.
    </p>

    <!-- Decorative elements to fill space/add context -->
    <div class="absolute bottom-10 right-10 flex gap-4">
      <div class="w-4 h-4 rounded-full bg-blue-500" />
      <div class="w-4 h-4 rounded-full bg-blue-400" />
      <div class="w-4 h-4 rounded-full bg-blue-300" />
    </div>
  </div>
</template>
