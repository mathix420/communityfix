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
  <div class="h-full text-black/80 w-full flex items-start justify-start border-solid border-b-20 border-blue-500 bg-gray-50">
    <div class="flex items-start justify-start h-full">
      <div class="flex flex-col justify-between w-full h-full">
        <div class="flex flex-row justify-between items-center w-full px-20 pt-15 gap-10">
          <h1
            style="font-family: Oswald"
            class="text-[60px] w-full max-w-[750px] font-medium underline decoration-blue-500 leading-snug"
          >
            {{ title }}
          </h1>
          <p
            v-if="number"
            style="font-family: Oswald"
            class="text-[70px] text-black/20 leading-none shrink-0"
          >
            {{ formatNumber(number) }}
          </p>
        </div>
        <p
          v-if="description"
          class="text-3xl px-20 pb-10 max-w-[1200px]"
        >
          {{ description }}
        </p>
        <div class="flex flex-row w-full px-20 pb-10 mt-auto gap-12">
          <div
            v-if="subIssueCount"
            class="flex flex-col"
          >
            <p
              class="text-[50px] leading-none -mb-3 text-black/20"
              style="font-family: Oswald"
            >
              {{ formatNumber(subIssueCount, { hash: false }) }}
            </p>
            <p class="text-lg font-bold uppercase text-black/60">
              Sub Issues
            </p>
          </div>
          <div
            v-if="solutionCount"
            class="flex flex-col"
          >
            <p
              class="text-[50px] leading-none -mb-3 text-black/20"
              style="font-family: Oswald"
            >
              {{ formatNumber(solutionCount, { hash: false }) }}
            </p>
            <p class="text-lg font-bold uppercase text-black/60">
              Solutions
            </p>
          </div>
          <div
            v-if="commentCount"
            class="flex flex-col"
          >
            <p
              class="text-[50px] leading-none -mb-3 text-black/20"
              style="font-family: Oswald"
            >
              {{ formatNumber(commentCount, { hash: false }) }}
            </p>
            <p class="text-lg font-bold uppercase text-black/60">
              Comments
            </p>
          </div>
          <div
            v-if="sourceCount"
            class="flex flex-col"
          >
            <p
              class="text-[50px] leading-none -mb-3 text-black/20"
              style="font-family: Oswald"
            >
              {{ formatNumber(sourceCount, { hash: false }) }}
            </p>
            <p class="text-lg font-bold uppercase text-black/60">
              Sources
            </p>
          </div>
        </div>
        <p
          style="font-family: Oswald"
          class="text-2xl pb-10 px-20 font-bold mb-0 text-right"
        >
          communityfix.org
        </p>
      </div>
    </div>
  </div>
</template>
