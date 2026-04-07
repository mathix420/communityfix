<script setup lang="ts">
const route = useRoute()
const issueId = computed(() => route.params.issueId)
const toast = useToast()

const sort = ref('trending')
const sortOptions = [
  { label: 'Trending', value: 'trending' },
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Most Voted', value: 'most_voted' },
]

const { data: subIssues, refresh } = await useFetch(() => `/api/issue/${issueId.value}/issues`, {
  query: computed(() => sort.value !== 'trending' ? { sort: sort.value } : {}),
  watch: [sort],
})

const showForm = ref(false)
const submitting = ref(false)
const title = ref('')
const description = ref('')

async function submit() {
  submitting.value = true
  try {
    await $fetch('/api/issue', {
      method: 'POST',
      body: {
        title: title.value,
        description: description.value,
        parentId: Number(issueId.value),
        type: 'issue' as const,
      },
    })
    umami.track('Sub-issue proposed', { issueId: Number(issueId.value) })
    title.value = ''
    description.value = ''
    showForm.value = false
    await refresh()
  }
  catch (error: any) {
    toast.add({
      title: 'Failed to propose sub-issue',
      description: error?.data?.message || error?.message || 'Please try again.',
      color: 'error',
    })
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mt-4 flex flex-col max-w-3xl mx-auto gap-4">
    <div class="flex items-center justify-between gap-2">
      <AuthState v-slot="{ loggedIn }">
        <UButton
          v-if="loggedIn && !showForm"
          color="primary"
          size="lg"
          data-umami-event="Open sub-issue form"
          @click="showForm = true"
        >
          Propose a sub-issue
        </UButton>
      </AuthState>
      <USelectMenu
        v-model="sort"
        :items="sortOptions"
        value-key="value"
        size="md"
        class="w-44 ml-auto"
      />
    </div>

    <AuthState v-slot="{ loggedIn }">
      <UiCard
        v-if="loggedIn && showForm"
        padding="lg"
        class="flex flex-col gap-4"
      >
        <form
          class="grid gap-4"
          @submit.prevent="submit"
        >
          <UFormField
            label="Title"
            name="title"
            required
          >
            <UInput
              v-model="title"
              type="text"
              placeholder="Sub-issue title"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Description"
            name="description"
            required
          >
            <UTextarea
              v-model="description"
              placeholder="Describe the sub-issue"
              size="lg"
              class="w-full"
              :rows="3"
            />
          </UFormField>

          <div class="flex gap-2">
            <UButton
              type="submit"
              color="primary"
              size="lg"
              :loading="submitting"
            >
              Submit
            </UButton>
            <UButton
              variant="ghost"
              size="lg"
              @click="showForm = false"
            >
              Cancel
            </UButton>
          </div>
        </form>
      </UiCard>
    </AuthState>

    <CardIssue
      v-for="issue in subIssues"
      :key="issue.id"
      :issue="issue"
    />

    <p
      v-if="subIssues?.length === 0"
      class="text-toned text-center py-8"
    >
      No sub-issues yet.
    </p>
  </div>
</template>
