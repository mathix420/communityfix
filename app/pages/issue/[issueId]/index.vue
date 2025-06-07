<script setup lang="ts">
const route = useRoute()
const issueId = route.params.issueId as string

const { data: issue } = await useFetch(`/api/issue/${issueId}`)
</script>

<template>
  <div
    v-if="issue"
    class="mt-3 bg-white rounded-lg p-6 space-y-6"
  >
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Tags Section -->
      <div>
        <h2 class="text-lg font-semibold text-gray-700 mb-3">
          Tags
        </h2>
        <div class="flex flex-wrap gap-2">
          <NuxtLink
            v-for="tag in issue.tags"
            :key="tag"
            :to="`/tag/${tag}`"
            class="px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-sm"
          >
            {{ tag }}
          </NuxtLink>
        </div>
      </div>

      <!-- Sustainable Development Goals Section -->
      <div>
        <h2 class="text-lg font-semibold text-gray-700 mb-3">
          Sustainable Development Goals
        </h2>
        <div class="flex flex-wrap gap-3">
          <NuxtLink
            v-for="goal in issue.sustainableDevelopmentGoals"
            :key="goal.id"
            :href="goal.link"
            target="_blank"
          >
            <img
              :src="goal.iconUrl"
              :alt="goal.name"
              :title="goal.name"
              class="size-20"
            >
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Description Section -->
    <div>
      <h2 class="text-lg font-semibold text-gray-700 mb-3">
        Description
      </h2>
      <div class="prose prose-sm max-w-none">
        {{ issue.detailedDescription }}
      </div>
    </div>
  </div>
  <div
    v-else
    class="mt-3 bg-white rounded-lg p-6 text-center"
  >
    <p class="text-gray-500">
      Loading issue details...
    </p>
  </div>
</template>
