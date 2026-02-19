<script setup lang="ts">
const toast = useToast()
const submitting = ref(false)

const title = ref('')
const description = ref('')
const detailedDescription = ref('')

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
    const issue = await $fetch('/api/issue', {
      method: 'POST',
      body: {
        title: title.value,
        description: description.value,
        detailedDescription: detailedDescription.value || undefined,
      },
    })
    umami.track('Issue created', { issueId: issue!.id })
    await navigateTo(`/issue/${issue!.id}`)
  }
  catch (error: any) {
    toast.add({
      title: 'Failed to create issue',
      description: error?.data?.message || error?.message || 'Please try again.',
      color: 'error',
    })
  }
  finally {
    submitting.value = false
  }
}

useSeoMeta({
  title: 'New Issue - CommunityFix',
  description: 'Create a new issue on CommunityFix.',
})

definePageMeta({
  middleware: ['auth'],
})
</script>

<template>
  <AppContainer>
    <section class="w-full max-w-2xl mx-auto">
      <UiPageHeader
        title="New Issue"
        description="Describe an issue you'd like the community to work on."
        center
      />

      <!-- Ban notice -->
      <UiCard
        v-if="banStatus?.banned"
        padding="lg"
        class="flex flex-col gap-3"
      >
        <div class="bg-red-50 rounded-lg px-4 py-4 space-y-3">
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
      </UiCard>

      <!-- Creation form (hidden when banned) -->
      <UiCard
        v-else
        padding="lg"
        class="flex flex-col gap-5"
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
              placeholder="A short, descriptive title"
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
              placeholder="Briefly describe the issue"
              size="lg"
              class="w-full"
              :rows="3"
            />
          </UFormField>

          <UFormField
            label="Detailed Description"
            name="detailedDescription"
          >
            <UTextarea
              v-model="detailedDescription"
              placeholder="Additional details..."
              size="lg"
              class="w-full"
              :rows="6"
            />
          </UFormField>

          <UButton
            type="submit"
            block
            size="lg"
            color="primary"
            :loading="submitting"
          >
            Create Issue
          </UButton>
        </form>
      </UiCard>
    </section>
  </AppContainer>
</template>
