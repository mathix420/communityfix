<script setup lang="ts">
const route = useRoute()
const issueId = route.params.issueId as string
const toast = useToast()

const { data: issue, refresh } = await useFetch(`/api/issue/${issueId}`)

const appealReason = ref('')
const appealSubmitting = ref(false)

async function submitAppeal() {
  appealSubmitting.value = true
  try {
    await $fetch(`/api/issue/${issueId}/appeal`, {
      method: 'POST',
      body: { reason: appealReason.value },
    })
    umami.track('Issue appeal submitted', { issueId: Number(issueId) })
    toast.add({ title: 'Appeal submitted', description: 'Your appeal is under review.', color: 'success' })
    await refresh()
  }
  catch (error: any) {
    toast.add({
      title: 'Failed to submit appeal',
      description: error?.data?.message || error?.message || 'Please try again.',
      color: 'error',
    })
  }
  finally {
    appealSubmitting.value = false
  }
}
</script>

<template>
  <div
    v-if="issue"
    class="mt-3 space-y-4"
  >
    <div
      v-if="issue.status === 'pending'"
      class="bg-yellow-50 text-yellow-700 rounded-lg px-4 py-3 text-sm font-mono text-center"
    >
      This issue is pending review and has not been published yet.
    </div>

    <!-- Rejected banner -->
    <div
      v-if="issue.status === 'rejected'"
      class="bg-red-50 rounded-lg px-4 py-4 space-y-3"
    >
      <p class="text-red-700 text-sm font-semibold">
        This issue was rejected by moderation.
      </p>
      <p class="text-red-600 text-sm">
        Reason: {{ issue.rejectionReason }}
      </p>

      <!-- Appeal already submitted -->
      <p
        v-if="issue.appealStatus === 'pending'"
        class="text-yellow-700 text-sm font-mono"
      >
        Your appeal is under review.
      </p>
      <p
        v-else-if="issue.appealStatus === 'denied'"
        class="text-red-700 text-sm font-mono"
      >
        Your appeal was denied.
      </p>

      <!-- Appeal form (only if not yet appealed and not spam) -->
      <div v-else-if="!issue.appealStatus && !issue.isSpam">
        <form
          class="flex flex-col gap-2"
          @submit.prevent="submitAppeal"
        >
          <UTextarea
            v-model="appealReason"
            placeholder="Explain why this issue should be reconsidered..."
            :rows="3"
            class="w-full"
          />
          <UButton
            type="submit"
            color="primary"
            size="sm"
            :loading="appealSubmitting"
            :disabled="!appealReason.trim()"
            data-umami-event="Appeal rejected issue"
          >
            Appeal this decision
          </UButton>
        </form>
      </div>
    </div>

    <div class="bg-white rounded-lg p-6 space-y-6">
      <div
        v-if="issue.tags?.length || issue.sustainableDevelopmentGoals?.length"
        class="grid grid-cols-1 md:grid-cols-2 gap-8"
      >
        <!-- Tags Section -->
        <div v-if="issue.tags?.length">
          <h2 class="text-lg font-semibold text-gray-700 mb-3">
            Tags
          </h2>
          <div class="flex flex-wrap gap-2">
            <NuxtLink
              v-for="tag in issue.tags"
              :key="tag"
              :to="`/tag/${tag}`"
              data-umami-event="Issue tag click"
              :data-umami-event-tag="tag"
            >
              <UiTag>{{ tag }}</UiTag>
            </NuxtLink>
          </div>
        </div>

        <!-- Sustainable Development Goals Section -->
        <div v-if="issue.sustainableDevelopmentGoals?.length">
          <h2 class="text-lg font-semibold text-gray-700 mb-3">
            Sustainable Development Goals
          </h2>
          <div class="flex flex-wrap gap-3">
            <NuxtLink
              v-for="goal in issue.sustainableDevelopmentGoals"
              :key="goal.id"
              :href="goal.link"
              target="_blank"
              data-umami-event="SDG link click"
              :data-umami-event-goal="goal.name"
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
