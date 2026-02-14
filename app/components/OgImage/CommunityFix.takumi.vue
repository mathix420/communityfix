<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  number?: number
  description?: string
  solutionCount?: number
  subIssueCount?: number
  commentCount?: number
  sourceCount?: number
}>(), {
  title: 'title',
  number: 1,
  description: 'description',
  solutionCount: 0,
  subIssueCount: 0,
  commentCount: 0,
  sourceCount: 0,
})
</script>

<template>
  <div class="h-full w-full flex flex-col bg-gray-50 p-10">
    <!-- Header with title and number -->
    <div class="flex flex-row items-start w-full gap-10">
      <h1
        style="font-family: Oswald"
        class="text-6xl font-medium text-gray-800 leading-tight max-w-[750px]"
      >
        {{ title }}
      </h1>
      <p
        v-if="number"
        style="font-family: Oswald"
        class="text-7xl text-gray-300 leading-none"
      >
        #{{ number }}
      </p>
    </div>

    <!-- Description -->
    <p
      v-if="description"
      class="text-2xl text-gray-600 mt-6 max-w-[900px]"
    >
      {{ description }}
    </p>

    <!-- Stats row -->
    <div class="flex flex-row w-full mt-auto gap-12">
      <div
        v-if="subIssueCount"
        class="flex flex-col"
      >
        <p
          class="text-5xl leading-none text-gray-300"
          style="font-family: Oswald"
        >
          {{ subIssueCount }}
        </p>
        <p class="text-lg font-bold text-gray-500">
          SUB ISSUES
        </p>
      </div>
      <div
        v-if="solutionCount"
        class="flex flex-col"
      >
        <p
          class="text-5xl leading-none text-gray-300"
          style="font-family: Oswald"
        >
          {{ solutionCount }}
        </p>
        <p class="text-lg font-bold text-gray-500">
          SOLUTIONS
        </p>
      </div>
      <div
        v-if="commentCount"
        class="flex flex-col"
      >
        <p
          class="text-5xl leading-none text-gray-300"
          style="font-family: Oswald"
        >
          {{ commentCount }}
        </p>
        <p class="text-lg font-bold text-gray-500">
          COMMENTS
        </p>
      </div>
      <div
        v-if="sourceCount"
        class="flex flex-col"
      >
        <p
          class="text-5xl leading-none text-gray-300"
          style="font-family: Oswald"
        >
          {{ sourceCount }}
        </p>
        <p class="text-lg font-bold text-gray-500">
          SOURCES
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex flex-row w-full items-center mt-6">
      <div class="w-full h-4 bg-blue-500" />
    </div>
    <p
      style="font-family: Oswald"
      class="text-xl font-bold text-gray-800 mt-4 text-right w-full"
    >
      communityfix.org
    </p>
  </div>
</template>
