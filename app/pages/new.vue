<script setup lang="ts">
import type { LocationScale } from '../../server/database/schema'

const route = useRoute()
const toast = useToast()
const { track } = useUmami()
const submitting = ref(false)

const parentId = computed(() => {
  const raw = route.query.parent
  const n = Array.isArray(raw) ? Number(raw[0]) : Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
})

const childType = computed<'issue' | 'solution'>(() => {
  return route.query.type === 'solution' ? 'solution' : 'issue'
})

const isChild = computed(() => parentId.value != null)

const noun = computed(() => {
  if (!isChild.value) return 'issue'
  return childType.value === 'solution' ? 'solution' : 'sub-issue'
})
const Noun = computed(() => noun.value[0]!.toUpperCase() + noun.value.slice(1))

const title = ref('')
const summary = ref('')
const description = ref('')
const locationName = ref('')
const latitude = ref<number | undefined>()
const longitude = ref<number | undefined>()
const scale = ref<LocationScale>()

interface LinkRow { url: string, title: string }
const links = ref<LinkRow[]>([])
function addLink() {
  links.value.push({ url: '', title: '' })
}
function removeLink(i: number) {
  links.value.splice(i, 1)
}

const { data: banStatus } = await useFetch('/api/user/ban-status')

const { data: parent } = await useAsyncData(
  'new-page-parent',
  () => parentId.value ? $fetch(`/api/issue/${parentId.value}`) : Promise.resolve(null),
  { watch: [parentId] },
)

const similarIssues = ref<{ id: number, title: string, summary: string, similarity: number }[]>([])
const similarStatus = ref<'ok' | 'unavailable' | 'too_short'>('too_short')
const searchingDuplicates = ref(false)

let debounceTimer: ReturnType<typeof setTimeout>
watch([title, summary], () => {
  clearTimeout(debounceTimer)
  if (title.value.length < 5 || summary.value.length < 10) {
    similarIssues.value = []
    similarStatus.value = 'too_short'
    return
  }
  debounceTimer = setTimeout(async () => {
    searchingDuplicates.value = true
    try {
      const response = await $fetch('/api/issues/similar', {
        query: { title: title.value, summary: summary.value },
      })
      similarIssues.value = response.results
      similarStatus.value = response.status
    }
    catch {
      similarIssues.value = []
      similarStatus.value = 'unavailable'
    }
    finally {
      searchingDuplicates.value = false
    }
  }, 500)
})

async function submit() {
  submitting.value = true
  try {
    const cleanedLinks = links.value
      .map(l => ({ url: l.url.trim(), title: l.title.trim() || undefined }))
      .filter(l => l.url)
    const issue = await $fetch('/api/issue', {
      method: 'POST',
      body: {
        title: title.value,
        summary: summary.value,
        description: description.value || undefined,
        locationName: locationName.value || undefined,
        latitude: latitude.value,
        longitude: longitude.value,
        scale: scale.value,
        parentId: parentId.value ?? undefined,
        type: isChild.value ? childType.value : undefined,
        links: childType.value === 'solution' && cleanedLinks.length ? cleanedLinks : undefined,
      },
    })
    if (isChild.value) {
      track(childType.value === 'solution' ? 'Solution proposed' : 'Sub-issue proposed', {
        issueId: parentId.value!,
      })
    }
    else {
      track('Issue created', { issueId: issue!.id })
    }
    await navigateTo(`/issue/${issue!.id}`)
  }
  catch (error: any) {
    toast.add({
      title: `Failed to create ${noun.value}`,
      description: error?.data?.message || error?.message || 'Please try again.',
      color: 'error',
    })
  }
  finally {
    submitting.value = false
  }
}

const pageTitle = computed(() => `New ${Noun.value}`)
const pageDescription = computed(() => {
  if (childType.value === 'solution') {
    return 'Propose a concrete solution that tackles the parent issue.'
  }
  if (isChild.value) {
    return 'Break the parent issue into a more focused sub-issue.'
  }
  return 'Describe an issue you\'d like the community to work on.'
})

useSeoMeta({
  title: () => `${pageTitle.value} - CommunityFix`,
  description: () => pageDescription.value,
})

definePageMeta({
  middleware: ['auth'],
})
</script>

<template>
  <AppContainer>
    <section class="w-full max-w-2xl mx-auto">
      <UiPageHeader
        :title="pageTitle"
        :description="pageDescription"
      />

      <IssueParentCallout
        v-if="isChild && parent"
        :parent="{ id: parent.id, title: parent.title }"
        :label="childType === 'solution' ? 'Solution for' : 'Parent issue'"
        class="mb-6"
      />

      <UiCard
        v-if="banStatus?.banned"
        padding="lg"
        class="flex flex-col gap-3"
      >
        <BanNotice :ban-status="banStatus" @appealed="refreshNuxtData()" />
      </UiCard>

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
              :placeholder="childType === 'solution' ? 'A short, descriptive solution title' : 'A short, descriptive title'"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Summary"
            name="summary"
            required
          >
            <UTextarea
              v-model="summary"
              :placeholder="childType === 'solution' ? 'Briefly describe the proposed solution' : 'Briefly describe the issue'"
              size="lg"
              class="w-full"
              :rows="3"
            />
          </UFormField>

          <UFormField
            label="Description"
            name="description"
          >
            <UTextarea
              v-model="description"
              placeholder="Additional details..."
              size="lg"
              class="w-full"
              :rows="6"
            />
          </UFormField>

          <LocationPicker
            v-model:latitude="latitude"
            v-model:longitude="longitude"
            v-model:location-name="locationName"
            v-model:scale="scale"
          />

          <section v-if="childType === 'solution'" class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700">Links</span>
              <button
                type="button"
                class="text-xs font-mono text-primary-700 hover:text-primary-900 inline-flex items-center gap-1"
                @click="addLink"
              >
                <UIcon name="lucide:plus" class="size-3.5" />
                Add link
              </button>
            </div>
            <div
              v-for="(l, i) in links"
              :key="i"
              class="grid grid-cols-[1fr_1fr_auto] gap-2"
            >
              <UInput v-model="l.url" type="url" placeholder="https://..." size="md" />
              <UInput v-model="l.title" type="text" placeholder="Title (optional)" size="md" />
              <button
                type="button"
                class="text-gray-400 hover:text-red-600 px-2"
                aria-label="Remove link"
                @click="removeLink(i)"
              >
                <UIcon name="lucide:x" class="size-4" />
              </button>
            </div>
            <p v-if="!links.length" class="text-xs text-gray-400 font-mono">
              No links yet — GitHub repo, hosted PDFs, demo videos, Notion playbook, design files.
            </p>
          </section>

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

          <div
            v-else-if="similarStatus === 'unavailable'"
            class="flex items-center gap-2 text-xs text-gray-500"
          >
            <UIcon name="lucide:alert-circle" class="size-4" />
            Similarity check is temporarily unavailable — please double-check existing issues before submitting.
          </div>

          <UButton
            type="submit"
            block
            size="lg"
            color="primary"
            :loading="submitting"
          >
            {{ childType === 'solution' ? 'Submit Solution' : (isChild ? 'Submit Sub-issue' : 'Create Issue') }}
          </UButton>
        </form>
      </UiCard>
    </section>
  </AppContainer>
</template>
