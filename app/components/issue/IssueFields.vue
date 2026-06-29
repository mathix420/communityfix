<script setup lang="ts">
import type { LocationScale, SolutionStatus } from '../../../server/database/schema'

// Shared editable field group for an issue / solution. Lifted verbatim out of
// `pages/new.vue` so the create flow and the edit/propose modal render the exact
// same inputs. Every field is a discrete `v-model:*` (mirroring LocationPicker)
// so callers bind only what they need — the create page leaves `solutionStatus`
// unbound, the edit modal binds it.
//
// `kind` toggles the solution-only fields (links + solution status). Placeholders
// match the parent page's `childType === 'solution'` branches.

export interface IssueLinkRow { url: string, title: string }

const props = withDefaults(defineProps<{
  kind: 'issue' | 'solution'
  // The create page has no solution-status control; the edit modal does. Off by
  // default so the create flow stays byte-for-byte identical.
  showSolutionStatus?: boolean
}>(), {
  showSolutionStatus: false,
})

const title = defineModel<string>('title', { default: '' })
const summary = defineModel<string>('summary', { default: '' })
const description = defineModel<string>('description', { default: '' })
const locationName = defineModel<string>('locationName', { default: '' })
const latitude = defineModel<number | undefined>('latitude')
const longitude = defineModel<number | undefined>('longitude')
const scale = defineModel<LocationScale | undefined>('scale')
const solutionStatus = defineModel<SolutionStatus | undefined>('solutionStatus')
// Repeatable link rows (solution-only). Owned by the parent so submit payloads
// keep building from the same array.
const links = defineModel<IssueLinkRow[]>('links', { default: () => [] })

const isSolution = computed(() => props.kind === 'solution')

const solutionStatusOptions: { label: string, value: SolutionStatus }[] = [
  { label: 'Plan', value: 'plan' },
  { label: 'In progress', value: 'in-progress' },
  { label: 'Done', value: 'done' },
]

function addLink() {
  links.value.push({ url: '', title: '' })
}
function removeLink(i: number) {
  links.value.splice(i, 1)
}
</script>

<template>
  <UFormField
    label="Title"
    name="title"
    required
  >
    <UInput
      v-model="title"
      type="text"
      :placeholder="isSolution ? 'A short, descriptive solution title' : 'A short, descriptive title'"
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
      :placeholder="isSolution ? 'Briefly describe the proposed solution' : 'Briefly describe the issue'"
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

  <UFormField
    v-if="isSolution && showSolutionStatus"
    label="Status"
    name="solutionStatus"
  >
    <USelectMenu
      v-model="solutionStatus"
      :items="solutionStatusOptions"
      value-key="value"
      placeholder="Status..."
      size="lg"
      class="w-full"
    />
  </UFormField>

  <section v-if="isSolution" class="flex flex-col gap-2">
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
</template>
