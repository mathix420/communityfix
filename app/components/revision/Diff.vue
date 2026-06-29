<script setup lang="ts">
import { wordDiff } from '~/utils/word-diff'

// Presentational field-by-field diff for a single revision. Renders one row per
// changed field (iterating the keys of `changes`):
//   - Long text fields → inline word-diff (removed struck-through red, added
//     green) via the dependency-free `wordDiff` util.
//   - parentId / solutionId → a structural "Parent: #old → #new" id row (ids
//     only; this component stays pure and never fetches titles).
//   - Arrays + scalars → a compact "old → new" before/after pair.
// `before` / `after` / `changes` are the snapshot maps from a SerializedRevision
// (`baseSnapshot`, `appliedSnapshot`, `changes`). Any of them may be passed; the
// component reads `before` for old values and prefers `after` then `changes`
// for new values, so it works for both proposed (no appliedSnapshot yet) and
// applied revisions.

const props = defineProps<{
  before: Record<string, unknown>
  after: Record<string, unknown>
  changes: Record<string, unknown>
}>()

// Fields rendered with an inline word-diff.
const TEXT_FIELDS = new Set(['title', 'summary', 'description'])
// Structural reparent/re-attach fields, rendered as id rows.
const STRUCTURAL_FIELDS = new Set(['parentId', 'solutionId'])

// Humanise a snapshot key into a short label. Falls back to splitting camelCase.
const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  summary: 'Summary',
  description: 'Description',
  solutionStatus: 'Solution status',
  locationName: 'Location',
  location: 'Coordinates',
  scale: 'Scale',
  links: 'Links',
  parentId: 'Parent',
  solutionId: 'Solution',
  outcome: 'Outcome',
  implementer: 'Implementer',
  startDate: 'Start date',
  endDate: 'End date',
  metrics: 'Metrics',
  cost: 'Cost',
  currency: 'Currency',
  fundingSource: 'Funding source',
  sources: 'Sources',
  lessonsLearned: 'Lessons learned',
}

function humanise(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key]
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

const rows = computed(() => Object.keys(props.changes).map((key) => {
  const oldValue = props.before?.[key]
  // Prefer the applied snapshot's value; fall back to the raw change payload.
  const newValue = key in props.after ? props.after[key] : props.changes[key]
  let kind: 'text' | 'structural' | 'value' = 'value'
  if (TEXT_FIELDS.has(key)) kind = 'text'
  else if (STRUCTURAL_FIELDS.has(key)) kind = 'structural'
  return { key, label: humanise(key), kind, oldValue, newValue }
}))

function asText(value: unknown): string {
  return value == null ? '' : String(value)
}

// Render a scalar / array / object value compactly for the value rows. Strings
// pass through; arrays of {url,title}/strings become comma lists; coordinates
// render as "lat, lng"; everything else falls back to compact JSON.
function compact(value: unknown): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    if (value.length === 0) return '—'
    return value.map(item => compactItem(item)).join(', ')
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if ('latitude' in obj && 'longitude' in obj) {
      return `${obj.latitude}, ${obj.longitude}`
    }
    return JSON.stringify(value)
  }
  return String(value)
}

function compactItem(item: unknown): string {
  if (item == null) return '—'
  if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') return String(item)
  if (typeof item === 'object') {
    const obj = item as Record<string, unknown>
    if (typeof obj.title === 'string' && obj.title) return obj.title
    if (typeof obj.url === 'string') return obj.url
    return JSON.stringify(item)
  }
  return String(item)
}

// Structural rows show "#<id>"; a null/absent id becomes the muted dash.
function asId(value: unknown): string {
  if (value == null || value === '') return '—'
  return `#${value}`
}
</script>

<template>
  <div class="space-y-3 text-sm">
    <p v-if="rows.length === 0" class="text-xs text-toned">No field changes.</p>

    <div v-for="row in rows" :key="row.key" class="space-y-1">
      <span class="text-[11px] font-medium uppercase tracking-wide text-toned">{{ row.label }}</span>

      <!-- Long text → inline word diff -->
      <p v-if="row.kind === 'text'" class="leading-relaxed whitespace-pre-wrap break-words">
        <template
          v-for="(part, i) in wordDiff(asText(row.oldValue), asText(row.newValue))"
          :key="i"
        >
          <del
            v-if="part.type === 'removed'"
            class="rounded-sm bg-red-50 text-red-700 line-through decoration-red-400"
          >{{ part.value }}</del>
          <ins
            v-else-if="part.type === 'added'"
            class="rounded-sm bg-green-50 text-green-700 no-underline"
          >{{ part.value }}</ins>
          <span v-else>{{ part.value }}</span>
        </template>
        <span
          v-if="!asText(row.oldValue) && !asText(row.newValue)"
          class="text-toned"
        >—</span>
      </p>

      <!-- Reparent / re-attach → id-only structural row -->
      <p v-else-if="row.kind === 'structural'" class="font-mono text-xs">
        <span :class="row.oldValue == null ? 'text-toned' : 'text-gray-700'">{{ asId(row.oldValue) }}</span>
        <UIcon name="lucide:arrow-right" class="mx-1.5 inline size-3 align-middle text-gray-400" />
        <span class="text-gray-900">{{ asId(row.newValue) }}</span>
      </p>

      <!-- Arrays + scalars → compact old → new -->
      <p v-else class="flex flex-wrap items-center gap-1.5">
        <span
          class="rounded bg-gray-50 px-1.5 py-0.5"
          :class="(row.oldValue == null || row.oldValue === '') ? 'text-toned' : 'text-gray-700 line-through decoration-gray-300'"
        >{{ compact(row.oldValue) }}</span>
        <UIcon name="lucide:arrow-right" class="size-3 text-gray-400" />
        <span class="rounded bg-green-50 px-1.5 py-0.5 text-green-700">{{ compact(row.newValue) }}</span>
      </p>
    </div>
  </div>
</template>
