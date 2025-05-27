<script setup lang="ts">
const props = defineProps<{
  problem: {
    id: number
    title: string
    description: string
    author: string
    date: string
    solutionCount?: number
    subProblemCount?: number
  }
}>()

const toast = useToast()

function handleShare() {
  const url = `${window.location.origin}/problem/${props.problem.id}`
  const title = props.problem.title
  const text = props.problem.description

  // Try to use Web Share API if available
  if (navigator.share) {
    navigator.share({
      title,
      text,
      url,
    }).catch(() => {})
  }
  else {
    // Fallback to clipboard copy
    navigator.clipboard.writeText(url)
      .then(() => {
        // Show success toast
        toast.add({
          title: 'Link copied!',
          description: 'Problem URL has been copied to clipboard',
          color: 'success',
        })
      })
      .catch((error) => {
        console.error('Failed to copy:', error)
        // Show error toast
        toast.add({
          title: 'Copy failed',
          description: 'Unable to copy link to clipboard',
          color: 'error',
        })
      })
  }
}
</script>

<template>
  <article class="bg-white rounded-lg">
    <div class="flex flex-col gap-4 p-4">
      <h2 class="font-title text-xl">
        <span class="text-gray-400 select-none text-base font-light font-mono mr-1">
          #{{ problem.id.toString().padStart(5, '0') }}
        </span>
        <NuxtLink
          class="interactive-underline"
          :to="`/problem/${problem.id}`"
        >
          {{ problem.title }}
        </NuxtLink>
      </h2>
      <p class="text-gray-700">
        {{ problem.description }}
      </p>
      <div class="flex gap-4 my-2">
        <div class="flex items-center flex-wrap gap-1 text-sm">
          <span class="px-2 py-1 bg-gray-100 whitespace-nowrap text-gray-700 font-mono rounded-md">
            {{ problem.solutionCount || 0 }} Solutions
          </span>
        </div>
        <div class="flex items-center gap-1 text-sm">
          <span class="px-2 py-1 bg-gray-100 whitespace-nowrap text-gray-700 font-mono rounded-md">
            {{ problem.subProblemCount || 0 }} Sub-problems
          </span>
        </div>
      </div>

      <div class="flex sm:items-center justify-between flex-col sm:flex-row gap-2">
        <span class="text-sm text-gray-500">Posted by {{ problem.author }}</span>

        <div class="flex ml-auto gap-1 sm:justify-baseline w-full sm:w-auto">
          <UButton
            leading-icon="lucide:share-2"
            variant="subtle"
            class="text-primary-600"
            @click="handleShare"
          >
            Share
          </UButton>
          <UButton
            leading-icon="lucide:plus"
            variant="subtle"
            :to="`/problem/${problem.id}`"
            class="w-full sm:w-auto text-primary-600"
          >
            Propose Solution
          </UButton>
        </div>
      </div>
    </div>
  </article>
</template>
