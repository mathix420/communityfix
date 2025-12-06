<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  number?: string
  description?: string
}>(), {
  title: 'title',
  number: '#00001',
  description: 'description',
})
</script>

<template>
  <div class="h-full w-full grainy flex items-start justify-start border-solid border-blue-500 border-[12px] bg-gray-50">
    <div class="flex items-start justify-start h-full">
      <div class="flex flex-col justify-between w-full h-full">
        <div class="flex flex-row justify-center items-center">
          <h1 class="text-[80px] p-20 font-mono font-medium underline decoration-blue-500 text-left">
            {{ title }}
          </h1>
          <p
            v-if="number"
            class="text-5xl text-black/10 font-mono sm:mt-0 -mt-5"
          >
            {{ number }}
          </p>
        </div>
        <p class="text-2xl pb-10 px-20 font-bold mb-0">
          communityfix.org
        </p>
      </div>
    </div>
  </div>
</template>
