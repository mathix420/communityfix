<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
})
</script>

<template>
  <div class="h-full w-full flex flex-col items-center justify-center bg-gray-50 p-10">
    <h1
      style="font-family: Oswald"
      class="text-8xl font-normal text-gray-800 mb-6"
    >
      communityfix.org
    </h1>
    <div class="w-64 h-2 bg-blue-500 mb-6" />
    <p
      style="font-family: Oswald"
      class="text-5xl text-gray-600"
    >
      Let's put our skills to work.
    </p>

    <!-- Decorative dots -->
    <div class="flex flex-row gap-4 mt-10">
      <div class="w-4 h-4 rounded-full bg-blue-500" />
      <div class="w-4 h-4 rounded-full bg-blue-400" />
      <div class="w-4 h-4 rounded-full bg-blue-300" />
    </div>
  </div>
</template>
