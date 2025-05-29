<script setup lang="ts">
const { data: issues } = await useFetch('/api/issues')
</script>

<template>
  <div class="container mx-auto p-4">
    <div class="w-full my-28 gap-4 sm:gap-6 text-center flex flex-col items-center justify-center">
      <h1 class="font-mono text-4xl sm:text-7xl underline decoration-primary">
        communityfix.org
      </h1>
      <p class="text-lg sm:text-2xl font-title text-primary-950">
        Let's put our skills to work.
      </p>
    </div>

    <p class="text-center text-lg sm:text-xl font-title text-primary-950 mb-8">
      Here are some of the issues we are currently working on:
    </p>
    <div class="flex flex-col max-w-3xl mx-auto gap-6">
      <CardIssue
        v-for="issue in issues"
        :key="issue.id"
        :issue="issue"
      />
    </div>
  </div>
</template>
