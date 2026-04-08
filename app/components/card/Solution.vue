<script setup lang="ts">
const { track } = useUmami()

const props = withDefaults(defineProps<{
  solution: {
    id: number
    parentId?: number | null
    title: string
    description: string
    authorId?: string | null
    author: string
    voteScore?: number
    solutionStatus?: string | null
    date?: string
  }
  // Show the "in response to #N" link in the footer. Off by default — on
  // the parent issue's own solutions tab the link is redundant; on a
  // profile or feed it's the missing context that ties the solution back
  // to a problem.
  showParent?: boolean
}>(), {
  showParent: false,
})

const toast = useToast()
const { loggedIn } = useUserSession()
const { score, userVote, loading, vote, fetchVotes } = useVote(props.solution.id, props.solution.voteScore ?? 0)

onMounted(() => {
  if (loggedIn.value) {
    fetchVotes()
  }
})

// Lifecycle stages: 0=plan, 1=in-progress, 2=done. -1 means the solution
// has been proposed but no status has been set yet.
const stageIndex = computed(() => {
  switch (props.solution.solutionStatus) {
    case 'plan': return 0
    case 'in-progress': return 1
    case 'done': return 2
    default: return -1
  }
})

// Fill colours for the lifecycle meter, derived from the same UiBadge
// variants CardIssue uses for solutionStatus so the visual language stays
// consistent across cards.
const filledDot = computed(() => {
  switch (props.solution.solutionStatus) {
    case 'in-progress': return 'bg-yellow-500'
    case 'done': return 'bg-green-500'
    case 'plan': return 'bg-gray-400'
    default: return 'bg-gray-300'
  }
})

const filledLine = computed(() => {
  switch (props.solution.solutionStatus) {
    case 'in-progress': return 'bg-yellow-500'
    case 'done': return 'bg-green-500'
    case 'plan': return 'bg-gray-400'
    default: return 'bg-gray-200'
  }
})

function handleVote(value: 1 | -1) {
  if (!loggedIn.value) {
    toast.add({ title: 'Sign in to endorse', color: 'warning' })
    return
  }
  vote(value)
  track(value === 1 ? 'Endorse solution' : 'Reject solution', { solutionId: props.solution.id })
}
</script>

<template>
  <article class="bg-white rounded-lg">
    <div class="p-4 flex flex-col gap-4 min-w-0">
      <h2 class="font-title text-xl flex items-baseline gap-2">
        <span class="shrink-0 text-gray-400 select-none text-base font-light font-mono mr-1">
          <UIcon name="lucide:lightbulb" class="size-4 inline -mt-0.5 mr-1 text-primary-500" />{{ formatNumber(solution.id) }}
        </span>
        <NuxtLink
          class="interactive-underline min-w-0 break-words"
          :to="`/issue/${solution.id}`"
        >
          {{ solution.title }}
        </NuxtLink>
      </h2>
      <p class="text-gray-700">
        {{ solution.description }}
      </p>

      <!-- Lifecycle meter — sits in the same row position as the location
           row on CardIssue, so the rhythm of the card stays identical. -->
      <div class="flex items-center gap-2 flex-wrap text-sm text-gray-500">
        <ol class="flex items-center gap-2 text-xs font-mono">
          <li class="flex items-center gap-1.5">
            <span
              class="size-2 rounded-full transition-colors"
              :class="stageIndex >= 0 ? filledDot : 'bg-white ring-1 ring-gray-300'"
            />
            <span :class="stageIndex >= 0 ? 'text-gray-700' : 'text-gray-400'">Plan</span>
          </li>
          <span
            class="h-px w-4 transition-colors"
            :class="stageIndex >= 1 ? filledLine : 'bg-gray-200'"
          />
          <li class="flex items-center gap-1.5">
            <span
              class="size-2 rounded-full transition-colors"
              :class="stageIndex >= 1 ? filledDot : 'bg-white ring-1 ring-gray-300'"
            />
            <span :class="stageIndex >= 1 ? 'text-gray-700' : 'text-gray-400'">In progress</span>
          </li>
          <span
            class="h-px w-4 transition-colors"
            :class="stageIndex >= 2 ? filledLine : 'bg-gray-200'"
          />
          <li class="flex items-center gap-1.5">
            <span
              class="size-2 rounded-full transition-colors"
              :class="stageIndex >= 2 ? filledDot : 'bg-white ring-1 ring-gray-300'"
            />
            <span :class="stageIndex >= 2 ? 'text-gray-700' : 'text-gray-400'">Done</span>
          </li>
        </ol>
      </div>

      <div class="flex justify-between flex-wrap gap-2">
        <div class="flex gap-2 my-2 flex-wrap items-center">
          <!-- Vote pill [UP | score | DOWN] — identical to CardIssue. -->
          <div class="inline-flex items-stretch rounded-md overflow-hidden bg-gray-100 text-sm font-mono">
            <button
              :class="[
                'px-2 flex items-center transition-colors',
                userVote === 1
                  ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                  : 'text-gray-700 hover:bg-gray-200',
              ]"
              :disabled="loading"
              aria-label="Endorse"
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
              aria-label="Reject"
              @click="handleVote(-1)"
            >
              <UIcon name="lucide:arrow-down" class="size-3.5" />
            </button>
          </div>

          <NuxtLink
            v-if="showParent && solution.parentId"
            :to="`/issue/${solution.parentId}`"
            class="flex items-center gap-1 text-sm"
            @click="track('View solution parent')"
          >
            <span class="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 transition-colors whitespace-nowrap text-gray-700 font-mono rounded-md">
              <UIcon name="lucide:corner-down-right" class="size-3" />
              In response to {{ formatNumber(solution.parentId) }}
            </span>
          </NuxtLink>
        </div>
        <NuxtLink
          v-if="solution.authorId"
          :to="`/user/${solution.authorId}`"
          class="flex items-center hover:bg-gray-100 transition-colors px-2 py-1 flex-wrap gap-2 text-sm rounded-md"
        >
          <img
            :src="`https://api.dicebear.com/9.x/glass/svg?seed=${solution.author}`"
            alt="Author Avatar"
            class="size-4 rounded-full"
          >
          <span class="whitespace-nowrap text-gray-700 font-mono">
            {{ solution.author }}
          </span>
        </NuxtLink>
        <span
          v-else
          class="flex items-center px-2 py-1 flex-wrap gap-2 text-sm rounded-md"
        >
          <img
            :src="`https://api.dicebear.com/9.x/glass/svg?seed=${solution.author}`"
            alt="Author Avatar"
            class="size-4 rounded-full"
          >
          <span class="whitespace-nowrap text-gray-700 font-mono">
            {{ solution.author }}
          </span>
        </span>
      </div>
    </div>
  </article>
</template>
