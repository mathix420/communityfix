<script setup lang="ts">
import type { LocationScale } from '../../server/database/schema'

const toast = useToast()
const { track } = useUmami()
const submitting = ref(false)

const title = ref('')
const description = ref('')
const detailedDescription = ref('')
const locationName = ref('')
const latitude = ref<number | undefined>()
const longitude = ref<number | undefined>()
const scale = ref<LocationScale>()

const { data: banStatus } = await useFetch('/api/user/ban-status')

// Similar issues detection
const similarIssues = ref<{ id: number, title: string, description: string, similarity: number }[]>([])
const searchingDuplicates = ref(false)

let debounceTimer: ReturnType<typeof setTimeout>
watch([title, description], () => {
  clearTimeout(debounceTimer)
  if (title.value.length < 5 || description.value.length < 10) {
    similarIssues.value = []
    return
  }
  debounceTimer = setTimeout(async () => {
    searchingDuplicates.value = true
    try {
      similarIssues.value = await $fetch('/api/issues/similar', {
        query: { title: title.value, description: description.value },
      })
    }
    catch {
      similarIssues.value = []
    }
    finally {
      searchingDuplicates.value = false
    }
  }, 500)
})

async function submit() {
  submitting.value = true
  try {
    const issue = await $fetch('/api/issue', {
      method: 'POST',
      body: {
        title: title.value,
        description: description.value,
        detailedDescription: detailedDescription.value || undefined,
        locationName: locationName.value || undefined,
        latitude: latitude.value,
        longitude: longitude.value,
        scale: scale.value,
      },
    })
    track('Issue created', { issueId: issue!.id })
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

          <!-- Location picker -->
          <LocationPicker
            v-model:latitude="latitude"
            v-model:longitude="longitude"
            v-model:location-name="locationName"
            v-model:scale="scale"
          />

          <!-- Similar issues panel -->
          <div
            v-if="similarIssues.length > 0"
            class="rounded-lg border border-yellow-200 bg-yellow-50 p-4"
          >
            <div class="flex items-center gap-2 mb-3">
              <UIcon name="lucide:alert-triangle" class="size-4 text-yellow-600" />
              <span class="text-sm font-medium text-yellow-800">Similar issues already exist</span>
            </div>
            <ul class="space-y-2">
              <li
                v-for="similar in similarIssues"
                :key="similar.id"
                class="flex items-start gap-2"
              >
                <NuxtLink
                  :to="`/issue/${similar.id}`"
                  class="text-sm text-primary-700 hover:text-primary-900 underline underline-offset-2 flex-1"
                >
                  {{ similar.title }}
                </NuxtLink>
                <span class="text-xs text-yellow-600 font-mono shrink-0">
                  {{ similar.similarity }}% match
                </span>
              </li>
            </ul>
            <p class="text-xs text-yellow-600 mt-2">
              Consider joining an existing issue instead of creating a duplicate.
            </p>
          </div>

          <div v-if="searchingDuplicates" class="flex items-center gap-2 text-sm text-gray-500">
            <UIcon name="lucide:loader-2" class="size-4 animate-spin" />
            Checking for similar issues...
          </div>

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
