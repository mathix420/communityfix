<script setup lang="ts">
const { track } = useUmami()
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
    voteScore?: number
    status?: string
    solutionStatus?: string | null
    locationName?: string | null
    scale?: string | null
  }
}>()

const toast = useToast()
const { loggedIn } = useUserSession()
const { score, userVote, loading, vote, fetchVotes } = useVote(props.issue.id, props.issue.voteScore ?? 0)

onMounted(() => {
  if (loggedIn.value) {
    fetchVotes()
  }
})


function handleVote(value: 1 | -1) {
  if (!loggedIn.value) {
    toast.add({ title: 'Sign in to vote', color: 'warning' })
    return
  }
  vote(value)
  track('Vote', { issueId: props.issue.id, value })
}

async function handleShare() {
  const url = `${window.location.origin}/issue/${props.issue.id}`
  const title = props.issue.title
  const text = props.issue.description

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      track('Share issue', { issueId: props.issue.id, method: 'native' })
    }
    catch {}
  }
  else {
    try {
      await navigator.clipboard.writeText(url)
      track('Share issue', { issueId: props.issue.id, method: 'clipboard' })
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
    <div class="p-4 flex flex-col gap-4 min-w-0">
      <h2 class="font-title text-xl flex items-baseline gap-2">
        <span class="shrink-0 text-gray-400 select-none text-base font-light font-mono mr-1">
          {{ formatNumber(issue.id) }}
        </span>
        <NuxtLink
          class="interactive-underline min-w-0 break-words"
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
        <UiBadge v-if="issue.solutionStatus === 'plan'" variant="default">
          Plan
        </UiBadge>
        <UiBadge v-else-if="issue.solutionStatus === 'in-progress'" variant="warning">
          In progress
        </UiBadge>
        <UiBadge v-else-if="issue.solutionStatus === 'done'" variant="success">
          Done
        </UiBadge>
      </h2>
      <p class="text-gray-700">
        {{ issue.description }}
      </p>
      <div v-if="issue.locationName || (issue.scale && issue.scale !== 'global')" class="flex items-center gap-2 flex-wrap text-sm text-gray-500">
        <span v-if="issue.locationName" class="flex items-center gap-1">
          <UIcon name="lucide:map-pin" class="size-3.5" />
          {{ issue.locationName }}
        </span>
        <span v-if="issue.scale && issue.scale !== 'global'" class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">
          {{ issue.scale }}
        </span>
      </div>
      <div class="flex justify-between flex-wrap gap-2">
        <div class="flex gap-2 my-2 flex-wrap items-center">
          <!-- Vote pill [UP | score | DOWN] -->
          <div class="inline-flex items-stretch rounded-md overflow-hidden bg-gray-100 text-sm font-mono">
            <button
              :class="[
                'px-2 flex items-center transition-colors',
                userVote === 1
                  ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                  : 'text-gray-700 hover:bg-gray-200',
              ]"
              :disabled="loading"
              aria-label="Upvote"
              @click="handleVote(1)"
            >
              <UIcon name="lucide:arrow-up" class="size-3.5" />
            </button>
            <span class="px-2 py-1 tabular-nums font-medium border-x border-gray-200 min-w-[2rem] text-center text-gray-700">
              {{ score }}
            </span>
            <button
              :class="[
                'px-2 flex items-center transition-colors',
                userVote === -1
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'text-gray-700 hover:bg-gray-200',
              ]"
              :disabled="loading"
              aria-label="Downvote"
              @click="handleVote(-1)"
            >
              <UIcon name="lucide:arrow-down" class="size-3.5" />
            </button>
          </div>

          <NuxtLink
            :to="`/issue/${issue.id}/solutions`"
            class="flex items-center flex-wrap gap-1 text-sm"
            @click="track('View solutions')"
          >
            <span class="px-2 py-1 bg-gray-100 hover:bg-gray-200 transition-colors whitespace-nowrap text-gray-700 font-mono rounded-md">
              {{ issue.solutionCount || 0 }} Solutions
            </span>
          </NuxtLink>
          <NuxtLink
            :to="`/issue/${issue.id}/issues`"
            class="flex items-center gap-1 text-sm"
            @click="track('View sub-issues')"
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
