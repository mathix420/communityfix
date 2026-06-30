<script setup lang="ts">
import type { CaseStudyOutcome, LocationScale } from '../../../server/database/schema'

// Shared editable field group for a case study. Lifted verbatim out of
// `pages/new-case-study.vue` so the create flow and the edit/propose modal
// render identical inputs. Every field is a discrete `v-model:*` (mirroring
// LocationPicker) and the four repeatable editors (lessons / sources / links /
// metrics) are bound as arrays the caller owns, so the submit-payload cleaning
// stays in the page unchanged.

export interface CaseStudyLinkRow {
  url: string
  title: string
}
export interface CaseStudyLessonRow {
  text: string
}
export interface CaseStudyMetricRow {
  label: string
  baseline: string
  result: string
  unit: string
}

const outcome = defineModel<CaseStudyOutcome | undefined>('outcome')
const locationName = defineModel<string>('locationName', { default: '' })
const latitude = defineModel<number | undefined>('latitude')
const longitude = defineModel<number | undefined>('longitude')
const scale = defineModel<LocationScale | undefined>('scale')
const implementer = defineModel<string>('implementer', { default: '' })
const startDate = defineModel<string>('startDate', { default: '' })
const endDate = defineModel<string>('endDate', { default: '' })
const description = defineModel<string>('description', { default: '' })
const cost = defineModel<number | undefined>('cost')
const currency = defineModel<string>('currency', { default: '' })
const fundingSource = defineModel<string>('fundingSource', { default: '' })

const lessons = defineModel<CaseStudyLessonRow[]>('lessons', { default: () => [] })
const sources = defineModel<CaseStudyLinkRow[]>('sources', { default: () => [] })
const links = defineModel<CaseStudyLinkRow[]>('links', { default: () => [] })
const metrics = defineModel<CaseStudyMetricRow[]>('metrics', { default: () => [] })

const outcomeOptions: { label: string; value: CaseStudyOutcome }[] = [
  { label: 'Success', value: 'success' },
  { label: 'Partial', value: 'partial' },
  { label: 'Failed', value: 'failed' },
  { label: 'Inconclusive', value: 'inconclusive' },
  { label: 'Ongoing', value: 'ongoing' },
]

function addLesson() {
  lessons.value.push({ text: '' })
}
function removeLesson(i: number) {
  lessons.value.splice(i, 1)
}

function addSource() {
  sources.value.push({ url: '', title: '' })
}
function removeSource(i: number) {
  sources.value.splice(i, 1)
}

function addLink() {
  links.value.push({ url: '', title: '' })
}
function removeLink(i: number) {
  links.value.splice(i, 1)
}

function addMetric() {
  metrics.value.push({ label: '', baseline: '', result: '', unit: '' })
}
function removeMetric(i: number) {
  metrics.value.splice(i, 1)
}
</script>

<template>
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
    <div v-for="(m, i) in metrics" :key="i" class="grid grid-cols-[1.2fr_1fr_1fr_auto_auto] gap-2">
      <UInput v-model="m.label" placeholder="Label (e.g. CO₂ emissions)" size="md" type="text" />
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
</template>
