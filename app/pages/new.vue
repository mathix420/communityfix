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

const { data: banStatus } = await useFetch('/api/user/ban-status')

const { data: parent } = await useAsyncData(
  'new-page-parent',
  () => parentId.value ? $fetch(`/api/issue/${parentId.value}`) : Promise.resolve(null),
  { watch: [parentId] },
)

const similarIssues = ref<{ id: number, title: string, summary: string, similarity: number }[]>([])
const similarStatus = ref<'ok' | 'unavailable' | 'too_short'>('too_short')
const searchingDuplicates = ref(false)
const acknowledgedNotDuplicate = ref(false)

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
    acknowledgedNotDuplicate.value = false
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
          <IssueFields
            v-model:title="title"
            v-model:summary="summary"
            v-model:description="description"
            v-model:location-name="locationName"
            v-model:latitude="latitude"
            v-model:longitude="longitude"
            v-model:scale="scale"
            v-model:links="links"
            :kind="childType"
          />

          <div
            v-if="similarIssues.length > 0"
            class="rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm overflow-hidden"
          >
            <div class="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-gray-100 bg-gray-50/50">
              <UIcon name="lucide:layers" class="size-4 text-gray-400" />
              <span class="text-sm font-medium text-gray-700">Similar issues found</span>
              <span class="ml-auto text-xs text-gray-400 font-mono">{{ similarIssues.length }} result{{ similarIssues.length > 1 ? 's' : '' }}</span>
            </div>
            <div class="divide-y divide-gray-100">
              <NuxtLink
                v-for="similar in similarIssues"
                :key="similar.id"
                :to="`/issue/${similar.id}`"
                target="_blank"
                class="flex items-center gap-3 px-4 sm:px-5 py-3 transition-colors hover:bg-gray-50 group"
              >
                <span class="text-gray-400 text-xs font-mono shrink-0 select-none">{{ formatNumber(similar.id) }}</span>
                <span class="text-sm text-gray-800 truncate group-hover:text-gray-950">{{ similar.title }}</span>
                <span class="ml-auto flex items-center gap-1.5 shrink-0">
                  <span class="text-xs font-mono text-gray-400">{{ similar.similarity }}%</span>
                  <UIcon name="lucide:arrow-up-right" class="size-3 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </span>
              </NuxtLink>
            </div>
            <label class="flex items-center gap-3 px-4 sm:px-5 py-3 border-t border-gray-100 bg-gray-50/30 cursor-pointer select-none group">
              <UCheckbox v-model="acknowledgedNotDuplicate" />
              <span class="text-sm text-gray-500 group-hover:text-gray-700 transition-colors">I've reviewed these and my issue is different</span>
            </label>
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
            :disabled="similarIssues.length > 0 && !acknowledgedNotDuplicate"
          >
            {{ childType === 'solution' ? 'Submit Solution' : (isChild ? 'Submit Sub-issue' : 'Create Issue') }}
          </UButton>
        </form>
      </UiCard>
    </section>
  </AppContainer>
</template>
