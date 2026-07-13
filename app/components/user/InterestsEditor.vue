<script setup lang="ts">
// Free-text interests with a live "targets these topics" preview. Interests
// are deliberately not tags: users can declare topics the catalog does not
// cover yet, and matching happens semantically later. Shared between the
// onboarding flow and the settings page.
const emit = defineEmits<{ (e: 'update:count', count: number): void }>()

const { track } = useUmami()
const toast = useToast()

type Interest = { id: number; label: string; createdAt: string }
type SimilarTag = { id: number; slug: string; name: string; similarity: number | null }
type PopularTag = { id: number; slug: string; name: string; uses: number }

const { data: interests, refresh: refreshInterests } =
  await useFetch<Interest[]>('/api/me/interests')
watchEffect(() => emit('update:count', interests.value?.length ?? 0))

// Popular tags as tap-to-fill suggestions; hide ones already added.
const { data: allTags } = await useFetch<PopularTag[]>('/api/tags')
const suggestions = computed(() => {
  const added = new Set((interests.value ?? []).map((i) => i.label.toLowerCase()))
  return (allTags.value ?? []).filter((t) => !added.has(t.name.toLowerCase())).slice(0, 8)
})

const draft = ref('')
const adding = ref(false)
const atLimit = computed(() => (interests.value?.length ?? 0) >= 10)

// Debounced similar-tags preview while typing.
const preview = ref<SimilarTag[] | null>(null)
const previewLoading = ref(false)
let previewTimer: ReturnType<typeof setTimeout> | undefined
watch(draft, (value) => {
  clearTimeout(previewTimer)
  const q = value.trim()
  if (q.length < 3) {
    preview.value = null
    previewLoading.value = false
    return
  }
  previewLoading.value = true
  previewTimer = setTimeout(async () => {
    try {
      const results = await $fetch<SimilarTag[]>('/api/tags/similar', { query: { q } })
      // Ignore stale responses: only apply if the input hasn't moved on.
      if (draft.value.trim() === q) preview.value = results
    } catch {
      preview.value = null
    } finally {
      if (draft.value.trim() === q) previewLoading.value = false
    }
  }, 500)
})
onUnmounted(() => clearTimeout(previewTimer))

const previewNames = computed(() => (preview.value ?? []).map((t) => t.name).join(', '))

function fillSuggestion(name: string) {
  draft.value = name
}

function fetchErrorMessage(error: unknown, fallback: string): string {
  const e = error as { data?: { statusMessage?: string }; message?: string }
  return e?.data?.statusMessage || e?.message || fallback
}

async function addInterest() {
  const label = draft.value.trim()
  if (label.length < 2) {
    toast.add({ title: 'Interests need at least 2 characters', color: 'warning' })
    return
  }
  adding.value = true
  try {
    await $fetch('/api/me/interests', { method: 'POST', body: { label } })
    track('Interest added')
    draft.value = ''
    preview.value = null
    await refreshInterests()
  } catch (error) {
    toast.add({
      title: 'Could not add interest',
      description: fetchErrorMessage(error, 'Please try again.'),
      color: 'error',
    })
  } finally {
    adding.value = false
  }
}

async function removeInterest(interest: Interest) {
  try {
    await $fetch(`/api/me/interests/${interest.id}` as '/api/me/interests/:id', {
      method: 'DELETE',
    })
    track('Interest removed')
    await refreshInterests()
  } catch (error) {
    toast.add({
      title: 'Could not remove interest',
      description: fetchErrorMessage(error, 'Please try again.'),
      color: 'error',
    })
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div v-if="interests && interests.length > 0" class="flex flex-wrap gap-2">
      <UiTag v-for="interest in interests" :key="interest.id" variant="primary">
        {{ interest.label }}
        <button
          class="ml-1.5 -mr-1 rounded-full p-0.5 text-primary-400 hover:text-primary-700 hover:bg-primary-100 transition-colors"
          type="button"
          :aria-label="`Remove ${interest.label}`"
          @click="removeInterest(interest)"
        >
          <UIcon class="size-3.5 block" name="lucide:x" />
        </button>
      </UiTag>
    </div>
    <form class="flex gap-2" @submit.prevent="addInterest">
      <UInput
        v-model="draft"
        class="flex-1"
        placeholder="e.g. beekeeping, youth mental health"
        size="lg"
        :disabled="atLimit"
        :maxlength="60"
      />
      <UButton
        color="primary"
        icon="lucide:plus"
        size="lg"
        type="submit"
        :disabled="atLimit"
        :loading="adding"
      >
        Add
      </UButton>
    </form>
    <p v-if="atLimit" class="text-xs text-gray-500 -mt-2">
      You have reached the limit of 10 interests. Remove one to add another.
    </p>
    <p
      v-else-if="draft.trim().length >= 3 && !previewLoading && preview"
      class="font-code text-xs text-gray-500 -mt-2"
    >
      <template v-if="preview.length > 0">
        targets topics like: {{ previewNames }}
      </template>
      <template v-else>
        nothing close in the catalog yet, you will be first to know
      </template>
    </p>
    <p v-else-if="previewLoading" class="font-code text-xs text-gray-400 -mt-2">
      checking the catalog...
    </p>
    <div v-if="suggestions.length > 0 && !atLimit" class="flex flex-wrap items-center gap-2">
      <span class="font-mono text-xs uppercase tracking-widest text-gray-400">
        Popular
      </span>
      <button
        v-for="tag in suggestions"
        :key="tag.id"
        type="button"
        @click="fillSuggestion(tag.name)"
      >
        <UiTag size="sm" variant="neutral">
          {{ tag.name }}
        </UiTag>
      </button>
    </div>
  </div>
</template>
