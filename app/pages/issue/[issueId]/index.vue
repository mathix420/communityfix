<script setup lang="ts">
const { track } = useUmami()
const route = useRoute()
const issueId = route.params.issueId as string
const toast = useToast()

const { data: issue, refresh } = await useFetch(`/api/issue/${issueId}`)

const { data: parentIssue } = await useFetch(
  () => `/api/issue/${issue.value?.parentId}`,
  { immediate: !!issue.value?.parentId, watch: false },
)

const mapExpanded = ref(false)
const mapVisible = ref(false)
const locationMapRef = ref<{ invalidateSize: () => void }>()
const hasCoords = computed(() => !!issue.value?.location)

function toggleMap() {
  mapExpanded.value = !mapExpanded.value
  if (mapExpanded.value && !mapVisible.value) {
    mapVisible.value = true
  }
}

function onMapTransitionEnd(e: TransitionEvent) {
  if (e.propertyName === 'height' && mapExpanded.value) {
    locationMapRef.value?.invalidateSize()
  }
}

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
    <!-- Parent issue reference -->
    <NuxtLink
      v-if="parentIssue"
      :to="`/issue/${parentIssue.id}`"
      class="group flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 transition-colors hover:border-primary hover:bg-primary-50"
      @click="track('Parent issue click', { from: Number(issueId), to: parentIssue.id })"
    >
      <UIcon name="lucide:corner-left-up" class="size-4 shrink-0 text-gray-400 group-hover:text-primary" />
      <div class="min-w-0">
        <p class="text-xs font-mono uppercase tracking-wide text-gray-400 group-hover:text-primary">
          Parent issue
        </p>
        <p class="truncate text-sm font-medium text-gray-700 group-hover:text-primary-700">
          <span class="text-gray-400 font-light font-mono mr-1">{{ formatNumber(parentIssue.id) }}</span>
          {{ parentIssue.title }}
        </p>
      </div>
    </NuxtLink>

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

    <div class="space-y-3">
      <!-- Tags & SDGs -->
      <div
        v-if="issue.tags?.length || issue.sustainableDevelopmentGoals?.length"
        class="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        <!-- Tags Section -->
        <div
          v-if="issue.tags?.length"
          class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
        >
          <div class="flex items-center gap-2 mb-2.5">
            <UIcon name="lucide:tags" class="size-4 text-gray-400" />
            <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
              Tags
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <NuxtLink
              v-for="tag in issue.tags"
              :key="tag"
              :to="`/tag/${tag}`"
              @click="track('Issue tag click', { tag })"
            >
              <UiTag rounded="md">{{ tag }}</UiTag>
            </NuxtLink>
          </div>
        </div>

        <!-- Sustainable Development Goals Section -->
        <div
          v-if="issue.sustainableDevelopmentGoals?.length"
          class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
        >
          <div class="flex items-center gap-2 mb-2.5">
            <UIcon name="lucide:globe" class="size-4 text-gray-400" />
            <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
              Sustainable Development Goals
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <NuxtLink
              v-for="goal in issue.sustainableDevelopmentGoals"
              :key="goal.id"
              :href="goal.link"
              target="_blank"
              @click="track('SDG link click', { goal: goal.name })"
            >
              <img
                :src="goal.iconUrl"
                :alt="goal.name"
                :title="goal.name"
                class="size-16"
              >
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Location Section -->
      <div
        v-if="issue.locationName || issue.scale"
        class="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden"
      >
        <component
          :is="hasCoords ? 'button' : 'div'"
          class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
          :class="[hasCoords && 'hover:bg-gray-100 cursor-pointer', mapExpanded && 'border-b border-gray-200']"
          @click="hasCoords && toggleMap()"
        >
          <UIcon name="lucide:map-pin" class="size-4 shrink-0 text-gray-400" />
          <div class="flex-1 min-w-0">
            <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
              Location
            </p>
            <div class="flex items-center gap-2 flex-wrap mt-1">
              <span v-if="issue.locationName" class="text-sm font-medium text-gray-700">
                {{ issue.locationName }}
              </span>
              <UiTag v-if="issue.scale" rounded="md" size="sm" variant="neutral" :interactive="false">
                {{ issue.scale }}
              </UiTag>
              <span
                v-if="issue.location"
                class="text-xs text-gray-400 font-mono"
              >
                {{ issue.location.latitude.toFixed(4) }}, {{ issue.location.longitude.toFixed(4) }}
              </span>
            </div>
          </div>
          <UIcon
            v-if="issue.location"
            name="lucide:chevron-down"
            class="size-4 shrink-0 text-gray-400 transition-transform duration-200"
            :class="{ 'rotate-180': mapExpanded }"
          />
        </component>
        <div
          class="map-reveal"
          :class="mapExpanded ? 'map-reveal--open' : ''"
          @transitionend="onMapTransitionEnd"
        >
          <LocationMap
            v-if="mapVisible && issue.location"
            ref="locationMapRef"
            :latitude="issue.location.latitude"
            :longitude="issue.location.longitude"
            :scale="issue.scale"
          />
        </div>
      </div>

      <!-- Description Section -->
      <div
        v-if="issue.detailedDescription"
        class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
      >
        <div class="flex items-center gap-2 mb-2.5">
          <UIcon name="lucide:file-text" class="size-4 text-gray-400" />
          <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
            Description
          </p>
        </div>
        <div class="prose prose-sm max-w-none text-gray-700">
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

<style scoped>
.map-reveal {
  height: 0;
  opacity: 0;
  transition: height 0.3s ease, opacity 0.25s ease 0.05s;
}

.map-reveal--open {
  height: 240px;
  opacity: 1;
}
</style>
