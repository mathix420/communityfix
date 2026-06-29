<script setup lang="ts">
import type { CaseStudyOutcome, LocationScale } from '../../../server/database/schema'

// Shared editable field group for a case study. Lifted verbatim out of
// `pages/new-case-study.vue` so the create flow and the edit/propose modal
// render identical inputs. Every field is a discrete `v-model:*` (mirroring
// LocationPicker) and the four repeatable editors (lessons / sources / links /
// metrics) are bound as arrays the caller owns, so the submit-payload cleaning
// stays in the page unchanged.

export interface CaseStudyLinkRow { url: string, title: string }
export interface CaseStudyLessonRow { text: string }
export interface CaseStudyMetricRow { label: string, baseline: string, result: string, unit: string }

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

const outcomeOptions: { label: string, value: CaseStudyOutcome }[] = [
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
      :items="outcomeOptions"
      value-key="value"
      placeholder="What happened?"
      size="lg"
      class="w-full"
    />
  </UFormField>

  <LocationPicker
    v-model:latitude="latitude"
    v-model:longitude="longitude"
    v-model:location-name="locationName"
    v-model:scale="scale"
  />

  <UFormField
    label="Implementer"
    name="implementer"
    hint="Who ran it (municipality, NGO, community group, company)"
  >
    <UInput
      v-model="implementer"
      type="text"
      placeholder="e.g. City of Curitiba, Cycling NGO..."
      size="lg"
      class="w-full"
    />
  </UFormField>

  <div class="grid grid-cols-2 gap-3">
    <UFormField label="Start date" name="startDate">
      <UInput
        v-model="startDate"
        type="date"
        size="lg"
        class="w-full"
      />
    </UFormField>
    <UFormField label="End date" name="endDate" hint="Leave empty if still running">
      <UInput
        v-model="endDate"
        type="date"
        size="lg"
        class="w-full"
      />
    </UFormField>
  </div>

  <UFormField label="Description" name="description" hint="Context, what was done, what happened, why">
    <UTextarea
      v-model="description"
      placeholder="Markdown supported..."
      size="lg"
      class="w-full"
      :rows="6"
    />
  </UFormField>

  <div class="grid grid-cols-[1fr_auto] gap-3">
    <UFormField label="Cost" name="cost">
      <UInput
        v-model.number="cost"
        type="number"
        placeholder="0"
        size="lg"
        class="w-full"
      />
    </UFormField>
    <UFormField label="Currency" name="currency" class="w-28">
      <UInput
        v-model="currency"
        type="text"
        placeholder="EUR"
        size="lg"
        :maxlength="8"
        class="w-full"
      />
    </UFormField>
  </div>

  <UFormField label="Funding source" name="fundingSource">
    <UInput
      v-model="fundingSource"
      type="text"
      placeholder="e.g. EU Horizon, municipal budget, private donor..."
      size="lg"
      class="w-full"
    />
  </UFormField>

  <section class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-gray-700">Lessons learned</span>
      <button
        type="button"
        class="text-xs font-mono text-primary-700 hover:text-primary-900 inline-flex items-center gap-1"
        @click="addLesson"
      >
        <UIcon name="lucide:plus" class="size-3.5" />
        Add lesson
      </button>
    </div>
    <div
      v-for="(l, i) in lessons"
      :key="i"
      class="grid grid-cols-[1fr_auto] gap-2"
    >
      <UInput
        v-model="l.text"
        type="text"
        placeholder="One lesson — what didn't transfer, caveat for replicators..."
        size="md"
      />
      <button
        type="button"
        class="text-gray-400 hover:text-red-600 px-2"
        aria-label="Remove lesson"
        @click="removeLesson(i)"
      >
        <UIcon name="lucide:x" class="size-4" />
      </button>
    </div>
    <p v-if="!lessons.length" class="text-xs text-gray-400 font-mono">
      No lessons yet — what didn't transfer, caveats for anyone replicating it.
    </p>
  </section>

  <section class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-gray-700">Sources</span>
      <button
        type="button"
        class="text-xs font-mono text-primary-700 hover:text-primary-900 inline-flex items-center gap-1"
        @click="addSource"
      >
        <UIcon name="lucide:plus" class="size-3.5" />
        Add source
      </button>
    </div>
    <div
      v-for="(s, i) in sources"
      :key="i"
      class="grid grid-cols-[1fr_1fr_auto] gap-2"
    >
      <UInput v-model="s.url" type="url" placeholder="https://..." size="md" />
      <UInput v-model="s.title" type="text" placeholder="Title (optional)" size="md" />
      <button
        type="button"
        class="text-gray-400 hover:text-red-600 px-2"
        aria-label="Remove source"
        @click="removeSource(i)"
      >
        <UIcon name="lucide:x" class="size-4" />
      </button>
    </div>
    <p v-if="!sources.length" class="text-xs text-gray-400 font-mono">
      No sources added yet — reports, articles, official documentation strengthen credibility.
    </p>
  </section>

  <section class="flex flex-col gap-2">
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
      No links yet — GitHub repo, hosted PDFs, demo videos, photo album, design files.
    </p>
  </section>

  <section class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-gray-700">Metrics</span>
      <button
        type="button"
        class="text-xs font-mono text-primary-700 hover:text-primary-900 inline-flex items-center gap-1"
        @click="addMetric"
      >
        <UIcon name="lucide:plus" class="size-3.5" />
        Add metric
      </button>
    </div>
    <div
      v-for="(m, i) in metrics"
      :key="i"
      class="grid grid-cols-[1.2fr_1fr_1fr_auto_auto] gap-2"
    >
      <UInput v-model="m.label" type="text" placeholder="Label (e.g. CO₂ emissions)" size="md" />
      <UInput v-model="m.baseline" type="text" placeholder="Baseline" size="md" />
      <UInput v-model="m.result" type="text" placeholder="Result" size="md" />
      <UInput v-model="m.unit" type="text" placeholder="Unit" size="md" class="w-20" />
      <button
        type="button"
        class="text-gray-400 hover:text-red-600 px-2"
        aria-label="Remove metric"
        @click="removeMetric(i)"
      >
        <UIcon name="lucide:x" class="size-4" />
      </button>
    </div>
    <p v-if="!metrics.length" class="text-xs text-gray-400 font-mono">
      No metrics yet — structured before/after numbers make case studies comparable.
    </p>
  </section>
</template>
