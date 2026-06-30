<script setup lang="ts">
import type { CaseStudyOutcome, LocationScale } from '../../server/database/schema'

const route = useRoute()
const toast = useToast()
const { track } = useUmami()
const submitting = ref(false)

const solutionId = computed(() => {
  const raw = route.query.solution
  const n = Array.isArray(raw) ? Number(raw[0]) : Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
})

const outcome = ref<CaseStudyOutcome>()
const locationName = ref('')
const latitude = ref<number | undefined>()
const longitude = ref<number | undefined>()
const scale = ref<LocationScale>()
const implementer = ref('')
const startDate = ref('')
const endDate = ref('')
const description = ref('')
const cost = ref<number | undefined>()
const currency = ref('')
const fundingSource = ref('')

interface LessonRow {
  text: string
}
const lessons = ref<LessonRow[]>([])

interface LinkRow {
  url: string
  title: string
}
const sources = ref<LinkRow[]>([])
const links = ref<LinkRow[]>([])

interface MetricRow {
  label: string
  baseline: string
  result: string
  unit: string
}
const metrics = ref<MetricRow[]>([])

const { data: banStatus } = await useFetch('/api/user/ban-status')

// Parent must be a solution. We fetch it for display and to surface a clear
// error if the query param points at an issue (or nothing) rather than silently
// allowing the form to submit and 4xx on the server.
const { data: parent } = await useAsyncData(
  'new-case-study-parent',
  () => (solutionId.value ? $fetch(`/api/issue/${solutionId.value}`) : Promise.resolve(null)),
  { watch: [solutionId] },
)

const parentIsValid = computed(() => parent.value?.type === 'solution')

async function submit() {
  if (!solutionId.value) {
    toast.add({
      title: 'Missing solution',
      description: 'This form needs ?solution=<id> in the URL.',
      color: 'error',
    })
    return
  }
  if (!outcome.value) {
    toast.add({ title: 'Outcome required', color: 'error' })
    return
  }
  if (!locationName.value.trim() || latitude.value == null || longitude.value == null) {
    toast.add({
      title: 'Location required',
      description: 'Pick a place on the map or search above.',
      color: 'error',
    })
    return
  }
  submitting.value = true
  try {
    const cleanedSources = sources.value
      .map((s) => ({ url: s.url.trim(), title: s.title.trim() || undefined }))
      .filter((s) => s.url)
    const cleanedLinks = links.value
      .map((l) => ({ url: l.url.trim(), title: l.title.trim() || undefined }))
      .filter((l) => l.url)
    const cleanedMetrics = metrics.value
      .map((m) => ({
        label: m.label.trim(),
        baseline: m.baseline.trim() || undefined,
        result: m.result.trim() || undefined,
        unit: m.unit.trim() || undefined,
      }))
      .filter((m) => m.label)
    const cleanedLessons = lessons.value.map((l) => l.text.trim()).filter(Boolean)

    await $fetch('/api/case-study', {
      method: 'POST',
      body: {
        solutionId: solutionId.value,
        outcome: outcome.value,
        locationName: locationName.value,
        latitude: latitude.value,
        longitude: longitude.value,
        scale: scale.value,
        implementer: implementer.value || undefined,
        startDate: startDate.value || undefined,
        endDate: endDate.value || undefined,
        description: description.value || undefined,
        cost: cost.value,
        currency: currency.value || undefined,
        fundingSource: fundingSource.value || undefined,
        lessonsLearned: cleanedLessons.length ? cleanedLessons : undefined,
        sources: cleanedSources.length ? cleanedSources : undefined,
        links: cleanedLinks.length ? cleanedLinks : undefined,
        metrics: cleanedMetrics.length ? cleanedMetrics : undefined,
      },
    })
    track('Case study submitted', { solutionId: solutionId.value })
    await navigateTo(`/issue/${solutionId.value}/studies`)
  } catch (error: any) {
    toast.add({
      title: 'Failed to create case study',
      description: error?.data?.message || error?.message || 'Please try again.',
      color: 'error',
    })
  } finally {
    submitting.value = false
  }
}

useSeoMeta({
  title: 'Document a case study - CommunityFix',
  description: 'Record a real-world implementation of a proposed solution.',
})

definePageMeta({
  middleware: ['auth'],
})
</script>

<template>
  <AppContainer>
    <section class="w-full max-w-2xl mx-auto">
      <UiPageHeader
        description="Record where this solution was actually tried, what happened, and what others can learn from it."
        title="Document a case study"
      />
      <IssueParentCallout
        v-if="parent && parentIsValid"
        class="mb-6"
        label="Case study of"
        :parent="{ id: parent.id, title: parent.title }"
      />
      <UiCard
        v-if="!solutionId || (parent && !parentIsValid)"
        class="flex items-start gap-3"
        padding="lg"
      >
        <UIcon class="size-5 text-red-600 shrink-0 mt-0.5" name="lucide:triangle-alert" />
        <div>
          <p class="font-medium text-gray-900">
            This form needs a solution to attach to.
          </p>
          <p class="text-sm text-gray-600 mt-1">
            Open a solution and click "Document a case study" from its Studies tab.
          </p>
        </div>
      </UiCard>
      <UiCard v-else-if="banStatus?.banned" class="flex flex-col gap-3" padding="lg">
        <BanNotice :ban-status="banStatus" @appealed="refreshNuxtData()" />
      </UiCard>
      <UiCard v-else class="flex flex-col gap-5" padding="lg">
        <form class="grid gap-4" @submit.prevent="submit">
          <CaseStudyFields
            v-model:cost="cost"
            v-model:currency="currency"
            v-model:description="description"
            v-model:end-date="endDate"
            v-model:funding-source="fundingSource"
            v-model:implementer="implementer"
            v-model:latitude="latitude"
            v-model:lessons="lessons"
            v-model:links="links"
            v-model:location-name="locationName"
            v-model:longitude="longitude"
            v-model:metrics="metrics"
            v-model:outcome="outcome"
            v-model:scale="scale"
            v-model:sources="sources"
            v-model:start-date="startDate"
          />
          <UButton block color="primary" size="lg" type="submit" :loading="submitting">
            Submit case study
          </UButton>
        </form>
      </UiCard>
    </section>
  </AppContainer>
</template>
