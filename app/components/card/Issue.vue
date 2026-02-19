<script setup lang="ts">
const props = defineProps<{
  issue: {
    id: number
    title: string
    description: string
    authorId?: string | null
    author: string
    date: string
    solutionCount?: number
    subIssueCount?: number
    status?: string
  }
}>()

const toast = useToast()

async function handleShare() {
  const url = `${window.location.origin}/issue/${props.issue.id}`
  const title = props.issue.title
  const text = props.issue.description

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      umami.track('Share issue', { issueId: props.issue.id, method: 'native' })
    }
    catch {}
  }
  else {
    try {
      await navigator.clipboard.writeText(url)
      umami.track('Share issue', { issueId: props.issue.id, method: 'clipboard' })
      toast.add({
        title: 'Link copied!',
        description: 'Issue URL has been copied to clipboard',
        color: 'success',
      })
    }
    catch (error) {
      console.error('Failed to copy:', error)
      toast.add({
        title: 'Copy failed',
        description: 'Unable to copy link to clipboard',
        color: 'error',
      })
    }
  }
}
</script>

<template>
  <article class="bg-white rounded-lg">
    <div class="flex flex-col gap-4 p-4">
      <h2 class="font-title text-xl flex items-center gap-2 flex-wrap">
        <span class="text-gray-400 select-none text-base font-light font-mono mr-1">
          {{ formatNumber(issue.id) }}
        </span>
        <NuxtLink
          class="interactive-underline"
          :to="`/issue/${issue.id}`"
        >
          {{ issue.title }}
        </NuxtLink>
        <UiBadge v-if="issue.status === 'rejected'" variant="error">
          Rejected
        </UiBadge>
        <UiBadge v-else-if="issue.status === 'pending'" variant="warning">
          Pending
        </UiBadge>
      </h2>
      <p class="text-gray-700">
        {{ issue.description }}
      </p>
      <div class="flex justify-between flex-wrap gap-2">
        <div class="flex gap-2 my-2 flex-wrap">
          <NuxtLink
            :to="`/issue/${issue.id}/solutions`"
            class="flex items-center flex-wrap gap-1 text-sm"
            data-umami-event="View solutions"
          >
            <span class="px-2 py-1 bg-gray-100 hover:bg-gray-200 transition-colors whitespace-nowrap text-gray-700 font-mono rounded-md">
              {{ issue.solutionCount || 0 }} Solutions
            </span>
          </NuxtLink>
          <NuxtLink
            :to="`/issue/${issue.id}/issues`"
            class="flex items-center gap-1 text-sm"
            data-umami-event="View sub-issues"
          >
            <span class="px-2 py-1 bg-gray-100 hover:bg-gray-200 transition-colors whitespace-nowrap text-gray-700 font-mono rounded-md">
              {{ issue.subIssueCount || 0 }} Sub-issues
            </span>
          </NuxtLink>
        </div>
        <NuxtLink
          v-if="issue.authorId"
          :to="`/user/${issue.authorId}`"
          class="flex items-center hover:bg-gray-100 transition-colors px-2 py-1 flex-wrap gap-2 text-sm rounded-md"
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
        <span
          v-else
          class="flex items-center px-2 py-1 flex-wrap gap-2 text-sm rounded-md"
        >
          <img
            :src="`https://api.dicebear.com/9.x/glass/svg?seed=${issue.author}`"
            alt="Author Avatar"
            class="size-4 rounded-full"
          >
          <span class="whitespace-nowrap text-gray-700 font-mono">
            {{ issue.author }}
          </span>
        </span>
      </div>
    </div>
  </article>
</template>
