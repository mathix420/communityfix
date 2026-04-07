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

const { data: solutions, refresh } = await useFetch(() => `/api/issue/${issueId.value}/solutions`, {
  query: computed(() => sort.value !== 'trending' ? { sort: sort.value } : {}),
  watch: [sort],
})

const showForm = ref(false)
const submitting = ref(false)
const title = ref('')
const description = ref('')

const { loggedIn } = useUserSession()
const { data: banStatus } = await useFetch('/api/user/ban-status', {
  immediate: loggedIn.value,
  watch: false,
})

async function submit() {
  submitting.value = true
  try {
    await $fetch('/api/issue', {
      method: 'POST',
      body: {
        title: title.value,
        description: description.value,
        parentId: Number(issueId.value),
        type: 'solution' as const,
      },
    })
    umami.track('Solution proposed', { issueId: Number(issueId.value) })
    title.value = ''
    description.value = ''
    showForm.value = false
    await refresh()
  }
  catch (error: any) {
    toast.add({
      title: 'Failed to propose solution',
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
      <AuthState v-slot="{ loggedIn: isLoggedIn }">
        <UButton
          v-if="isLoggedIn && !banStatus?.banned && !showForm"
          color="primary"
          size="lg"
          data-umami-event="Open solution form"
          @click="showForm = true"
        >
          Propose a solution
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

    <AuthState v-slot="{ loggedIn: isLoggedIn }">
      <div v-if="isLoggedIn">
        <!-- Ban notice -->
        <BanNotice
          v-if="banStatus?.banned"
          :ban-status="banStatus"
          @appealed="refreshNuxtData()"
        />

        <!-- Solution form (hidden when banned) -->
        <UiCard
          v-else-if="showForm"
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
                placeholder="Solution title"
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
                placeholder="Describe your proposed solution"
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
      </div>
    </AuthState>

    <CardIssue
      v-for="solution in solutions"
      :key="solution.id"
      :issue="solution"
    />

    <p
      v-if="solutions?.length === 0"
      class="text-toned text-center py-8"
    >
      No solutions proposed yet.
    </p>
  </div>
</template>
