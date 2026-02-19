<script setup lang="ts">
const toast = useToast()
const submitting = ref(false)

const title = ref('')
const description = ref('')
const detailedDescription = ref('')

const { data: banStatus } = await useFetch('/api/user/ban-status')

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
        <BanNotice :ban-status="banStatus" @appealed="refreshNuxtData()" />
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
