<script setup lang="ts">
const route = useRoute()
const userId = route.params.id as string

const { data: user } = await useFetch(`/api/user/${userId}` as '/api/user/:id')

const displayName = computed(() => user.value?.name || 'Anonymous')
const joinedDate = computed(() => {
  if (!user.value?.createdAt) return ''
  return new Date(user.value.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

useSeoMeta({
  title: () => `${displayName.value} - CommunityFix`,
  description: () => `View ${displayName.value}'s profile and contributions on CommunityFix.`,
  ogTitle: () => `${displayName.value} - CommunityFix`,
  ogDescription: () => `View ${displayName.value}'s profile and contributions on CommunityFix.`,
  ogType: 'profile',
})
</script>

<template>
  <AppContainer class="container overflow-x-clip h-fit mx-auto p-4">
    <template v-if="user">
      <div class="w-full my-28 gap-4 sm:gap-6 text-center flex flex-col items-center justify-center">
        <img
          :src="`https://api.dicebear.com/9.x/glass/svg?seed=${displayName}`"
          :alt="`${displayName}'s avatar`"
          class="size-24 rounded-full"
        >
        <h1 class="font-mono text-4xl sm:text-5xl">
          {{ displayName }}
        </h1>
        <p class="text-lg text-gray-500">
          Joined {{ joinedDate }}
        </p>
      </div>

      <div v-if="user.issues.length > 0">
        <p class="text-center text-lg sm:text-xl font-title text-primary-950 mb-8">
          {{ user.issues.length }} issue{{ user.issues.length === 1 ? '' : 's' }} submitted:
        </p>
        <div class="flex flex-col max-w-3xl mx-auto gap-6">
          <CardIssue
            v-for="issue in user.issues"
            :key="issue.id"
            :issue="issue"
          />
        </div>
      </div>

      <div v-if="user.solutions.length > 0" class="mt-12">
        <p class="text-center text-lg sm:text-xl font-title text-primary-950 mb-8">
          {{ user.solutions.length }} solution{{ user.solutions.length === 1 ? '' : 's' }} proposed:
        </p>
        <div class="flex flex-col max-w-3xl mx-auto gap-6">
          <CardIssue
            v-for="solution in user.solutions"
            :key="solution.id"
            :issue="solution"
          />
        </div>
      </div>

      <div
        v-if="user.issues.length === 0 && user.solutions.length === 0"
        class="text-center text-lg text-gray-500 mt-12"
      >
        <p>No contributions yet.</p>
      </div>
    </template>

    <div
      v-else
      class="w-full my-28 text-center"
    >
      <p class="text-lg text-gray-500">
        User not found.
      </p>
    </div>
  </AppContainer>
</template>
