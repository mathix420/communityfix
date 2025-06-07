<script setup lang="ts">
const props = defineProps<{
  issue: {
    id: number
    title: string
    description: string
    author: string
    date: string
    solutionCount?: number
    subIssueCount?: number
  }
}>()

const toast = useToast()

function handleShare() {
  const url = `${window.location.origin}/issue/${props.issue.id}`
  const title = props.issue.title
  const text = props.issue.description

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
          description: 'Issue URL has been copied to clipboard',
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
          #{{ issue.id.toString().padStart(5, '0') }}
        </span>
        <NuxtLink
          class="interactive-underline"
          :to="`/issue/${issue.id}`"
        >
          {{ issue.title }}
        </NuxtLink>
      </h2>
      <p class="text-gray-700">
        {{ issue.description }}
      </p>
      <div class="flex justify-between flex-wrap gap-2">
        <div class="flex gap-2 my-2 flex-wrap">
          <NuxtLink
            :to="`/user/${issue.author}`"
            class="flex items-center bg-gray-100 px-2 py-1 flex-wrap gap-2 text-sm rounded-md"
          >
            <img
              :src="`https://api.dicebear.com/9.x/glass/svg?seed=${issue.author}`"
              alt="Author Avatar"
              class="size-4 rounded-full"
            >
            <span class="whitespace-nowrap text-gray-700 font-mono">
              {{ issue.author }}
            </span>
          </NuxtLink>
          <NuxtLink
            :to="`/issue/${issue.id}/solutions`"
            class="flex items-center flex-wrap gap-1 text-sm"
          >
            <span class="px-2 py-1 bg-gray-100 whitespace-nowrap text-gray-700 font-mono rounded-md">
              {{ issue.solutionCount || 0 }} Solutions
            </span>
          </NuxtLink>
          <NuxtLink
            :to="`/issue/${issue.id}/issues`"
            class="flex items-center gap-1 text-sm"
          >
            <span class="px-2 py-1 bg-gray-100 whitespace-nowrap text-gray-700 font-mono rounded-md">
              {{ issue.subIssueCount || 0 }} Sub-issues
            </span>
          </NuxtLink>
        </div>
        <div class="flex sm:items-center justify-between flex-col sm:flex-row gap-2">
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
              :to="`/issue/${issue.id}/solutions`"
              class="w-full sm:w-auto text-primary-600"
            >
              Propose Solution
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>
