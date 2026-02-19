<script setup lang="ts">
const route = useRoute()
const issueId = computed(() => route.params.issueId)
const toast = useToast()

const { data: solutions, refresh } = await useFetch(() => `/api/issue/${issueId.value}/solutions`)

const showForm = ref(false)
const submitting = ref(false)
const title = ref('')
const description = ref('')

const { data: banStatus } = await useFetch('/api/user/ban-status')
const banAppealSubmitting = ref(false)

async function submitBanAppeal() {
  banAppealSubmitting.value = true
  try {
    await $fetch('/api/user/ban-appeal', { method: 'POST' })
    umami.track('Ban appeal submitted')
    toast.add({ title: 'Appeal submitted', description: 'Your appeal is under review.', color: 'success' })
    await refreshNuxtData()
  }
  catch (error: any) {
    toast.add({
      title: 'Failed to submit appeal',
      description: error?.data?.message || error?.message || 'Please try again.',
      color: 'error',
    })
  }
  finally {
    banAppealSubmitting.value = false
  }
}

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
    <AuthState v-slot="{ loggedIn }">
      <div v-if="loggedIn">
        <!-- Ban notice -->
        <div
          v-if="banStatus?.banned"
          class="bg-red-50 rounded-lg px-4 py-4 space-y-3"
        >
          <p class="text-red-700 text-sm font-semibold">
            Your account is temporarily banned.
          </p>
          <p class="text-red-600 text-sm">
            {{ banStatus.reason }}
          </p>
          <p class="text-gray-600 text-sm">
            Ban expires: {{ new Date(banStatus.bannedUntil!).toLocaleDateString() }}
          </p>
          <div v-if="banStatus.appealStatus === 'pending'">
            <p class="text-yellow-700 text-sm font-mono">
              Your appeal is under review.
            </p>
          </div>
          <div v-else-if="banStatus.appealStatus === 'denied'">
            <p class="text-red-700 text-sm font-mono">
              Your appeal was denied.
            </p>
          </div>
          <div v-else-if="!banStatus.appealStatus">
            <UButton
              color="primary"
              size="sm"
              :loading="banAppealSubmitting"
              data-umami-event="Appeal ban"
              @click="submitBanAppeal"
            >
              Appeal this ban
            </UButton>
          </div>
        </div>

        <!-- Solution form (hidden when banned) -->
        <template v-else>
          <UButton
            v-if="!showForm"
            color="primary"
            size="lg"
            data-umami-event="Open solution form"
            @click="showForm = true"
          >
            Propose a solution
          </UButton>

          <UiCard
            v-else
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
        </template>
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
