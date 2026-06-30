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
function addLesson() {
  lessons.value.push({ text: '' })
}
function removeLesson(i: number) {
  lessons.value.splice(i, 1)
}

interface LinkRow {
  url: string
  title: string
}
const sources = ref<LinkRow[]>([])
function addSource() {
  sources.value.push({ url: '', title: '' })
}
function removeSource(i: number) {
  sources.value.splice(i, 1)
}

const links = ref<LinkRow[]>([])
function addLink() {
  links.value.push({ url: '', title: '' })
}
function removeLink(i: number) {
  links.value.splice(i, 1)
}

interface MetricRow {
  label: string
  baseline: string
  result: string
  unit: string
}
const metrics = ref<MetricRow[]>([])
function addMetric() {
  metrics.value.push({ label: '', baseline: '', result: '', unit: '' })
}
function removeMetric(i: number) {
  metrics.value.splice(i, 1)
}

const outcomeOptions: { label: string; value: CaseStudyOutcome }[] = [
  { label: 'Success', value: 'success' },
  { label: 'Partial', value: 'partial' },
  { label: 'Failed', value: 'failed' },
  { label: 'Inconclusive', value: 'inconclusive' },
  { label: 'Ongoing', value: 'ongoing' },
]

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
          <UFormField label="Outcome" name="outcome" required>
            <USelectMenu
              v-model="outcome"
              class="w-full"
              placeholder="What happened?"
              size="lg"
              value-key="value"
              :items="outcomeOptions"
            />
          </UFormField>
          <LocationPicker
            v-model:latitude="latitude"
            v-model:location-name="locationName"
            v-model:longitude="longitude"
            v-model:scale="scale"
          />
          <UFormField
            hint="Who ran it (municipality, NGO, community group, company)"
            label="Implementer"
            name="implementer"
          >
            <UInput
              v-model="implementer"
              class="w-full"
              placeholder="e.g. City of Curitiba, Cycling NGO..."
              size="lg"
              type="text"
            />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Start date" name="startDate">
              <UInput v-model="startDate" class="w-full" size="lg" type="date" />
            </UFormField>
            <UFormField hint="Leave empty if still running" label="End date" name="endDate">
              <UInput v-model="endDate" class="w-full" size="lg" type="date" />
            </UFormField>
          </div>
          <UFormField
            hint="Context, what was done, what happened, why"
            label="Description"
            name="description"
          >
            <UTextarea
              v-model="description"
              class="w-full"
              placeholder="Markdown supported..."
              size="lg"
              :rows="6"
            />
          </UFormField>
          <div class="grid grid-cols-[1fr_auto] gap-3">
            <UFormField label="Cost" name="cost">
              <UInput v-model.number="cost" class="w-full" placeholder="0" size="lg" type="number" />
            </UFormField>
            <UFormField class="w-28" label="Currency" name="currency">
              <UInput
                v-model="currency"
                class="w-full"
                placeholder="EUR"
                size="lg"
                type="text"
                :maxlength="8"
              />
            </UFormField>
          </div>
          <UFormField label="Funding source" name="fundingSource">
            <UInput
              v-model="fundingSource"
              class="w-full"
              placeholder="e.g. EU Horizon, municipal budget, private donor..."
              size="lg"
              type="text"
            />
          </UFormField>
          <section class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700">
                Lessons learned
              </span>
              <button
                class="text-xs font-mono text-primary-700 hover:text-primary-900 inline-flex items-center gap-1"
                type="button"
                @click="addLesson"
              >
                <UIcon class="size-3.5" name="lucide:plus" />
                Add lesson
              </button>
            </div>
            <div v-for="(l, i) in lessons" :key="i" class="grid grid-cols-[1fr_auto] gap-2">
              <UInput
                v-model="l.text"
                placeholder="One lesson — what didn't transfer, caveat for replicators..."
                size="md"
                type="text"
              />
              <button
                aria-label="Remove lesson"
                class="text-gray-400 hover:text-red-600 px-2"
                type="button"
                @click="removeLesson(i)"
              >
                <UIcon class="size-4" name="lucide:x" />
              </button>
            </div>
            <p v-if="!lessons.length" class="text-xs text-gray-400 font-mono">
              No lessons yet — what didn't transfer, caveats for anyone replicating it.
            </p>
          </section>
          <section class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700">
                Sources
              </span>
              <button
                class="text-xs font-mono text-primary-700 hover:text-primary-900 inline-flex items-center gap-1"
                type="button"
                @click="addSource"
              >
                <UIcon class="size-3.5" name="lucide:plus" />
                Add source
              </button>
            </div>
            <div v-for="(s, i) in sources" :key="i" class="grid grid-cols-[1fr_1fr_auto] gap-2">
              <UInput v-model="s.url" placeholder="https://..." size="md" type="url" />
              <UInput v-model="s.title" placeholder="Title (optional)" size="md" type="text" />
              <button
                aria-label="Remove source"
                class="text-gray-400 hover:text-red-600 px-2"
                type="button"
                @click="removeSource(i)"
              >
                <UIcon class="size-4" name="lucide:x" />
              </button>
            </div>
            <p v-if="!sources.length" class="text-xs text-gray-400 font-mono">
              No sources added yet — reports, articles, official documentation strengthen credibility.
            </p>
          </section>
          <section class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700">
                Links
              </span>
              <button
                class="text-xs font-mono text-primary-700 hover:text-primary-900 inline-flex items-center gap-1"
                type="button"
                @click="addLink"
              >
                <UIcon class="size-3.5" name="lucide:plus" />
                Add link
              </button>
            </div>
            <div v-for="(l, i) in links" :key="i" class="grid grid-cols-[1fr_1fr_auto] gap-2">
              <UInput v-model="l.url" placeholder="https://..." size="md" type="url" />
              <UInput v-model="l.title" placeholder="Title (optional)" size="md" type="text" />
              <button
                aria-label="Remove link"
                class="text-gray-400 hover:text-red-600 px-2"
                type="button"
                @click="removeLink(i)"
              >
                <UIcon class="size-4" name="lucide:x" />
              </button>
            </div>
            <p v-if="!links.length" class="text-xs text-gray-400 font-mono">
              No links yet — GitHub repo, hosted PDFs, demo videos, photo album, design files.
            </p>
          </section>
          <section class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700">
                Metrics
              </span>
              <button
                class="text-xs font-mono text-primary-700 hover:text-primary-900 inline-flex items-center gap-1"
                type="button"
                @click="addMetric"
              >
                <UIcon class="size-3.5" name="lucide:plus" />
                Add metric
              </button>
            </div>
            <div
              v-for="(m, i) in metrics"
              :key="i"
              class="grid grid-cols-[1.2fr_1fr_1fr_auto_auto] gap-2"
            >
              <UInput
                v-model="m.label"
                placeholder="Label (e.g. CO₂ emissions)"
                size="md"
                type="text"
              />
              <UInput v-model="m.baseline" placeholder="Baseline" size="md" type="text" />
              <UInput v-model="m.result" placeholder="Result" size="md" type="text" />
              <UInput v-model="m.unit" class="w-20" placeholder="Unit" size="md" type="text" />
              <button
                aria-label="Remove metric"
                class="text-gray-400 hover:text-red-600 px-2"
                type="button"
                @click="removeMetric(i)"
              >
                <UIcon class="size-4" name="lucide:x" />
              </button>
            </div>
            <p v-if="!metrics.length" class="text-xs text-gray-400 font-mono">
              No metrics yet — structured before/after numbers make case studies comparable.
            </p>
          </section>
          <UButton block color="primary" size="lg" type="submit" :loading="submitting">
            Submit case study
          </UButton>
        </form>
      </UiCard>
    </section>
  </AppContainer>
</template>
