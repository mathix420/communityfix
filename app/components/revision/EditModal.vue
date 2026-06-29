<script setup lang="ts">
import type { CaseStudyOutcome, LocationScale, SolutionStatus } from '../../../server/database/schema'
import type { IssueLinkRow } from '../issue/IssueFields.vue'
import type {
  CaseStudyLessonRow,
  CaseStudyLinkRow,
  CaseStudyMetricRow,
} from '../caseStudy/CaseStudyFields.vue'

// Edit / Suggest-edit modal. Wraps the shared IssueFields / CaseStudyFields
// groups seeded from the live node and submits to the same PATCH endpoint the
// owner/admin and proposer paths share. The endpoint decides: owner/admin →
// applied immediately (response `applied: true`); anyone else → a pending
// proposal (`applied: false`). We toast accordingly and emit `submitted` so the
// parent refreshes the node + its history.
//
// Mirrors AdminEditApproveModal's shape (UModal + `update:open`/`submitted`),
// but reuses the full field components so "anyone can propose changes for
// anything" covers every editable field, not just text. Field cleaning at
// submit replicates the create pages exactly (links/metrics/sources trimmed +
// filtered; lessons rows ↔ string[]).

// The node objects are the page's already-fetched payloads (transformIssue /
// transformCaseStudy), so only the fields we read are typed here.
interface IssueNode {
  id: number
  type?: 'issue' | 'solution'
  title: string
  summary: string
  description?: string | null
  solutionStatus?: SolutionStatus | null
  locationName?: string | null
  location?: { latitude: number, longitude: number } | null
  scale?: LocationScale | null
  links?: { url: string, title?: string | null }[] | null
  parentId?: number | null
}
interface CaseStudyNode {
  id: number
  solutionId: number
  outcome: CaseStudyOutcome
  locationName: string
  location?: { latitude: number, longitude: number } | null
  scale?: LocationScale | null
  implementer?: string | null
  startDate?: string | null
  endDate?: string | null
  description?: string | null
  cost?: string | number | null
  currency?: string | null
  fundingSource?: string | null
  lessonsLearned?: string[] | null
  sources?: { url: string, title?: string | null }[] | null
  links?: { url: string, title?: string | null }[] | null
  metrics?: { label: string, baseline?: string | null, result?: string | null, unit?: string | null }[] | null
}

const props = defineProps<{
  open: boolean
  // 'issue' | 'solution' map to the issue PATCH; 'case_study' to the case-study PATCH.
  kind: 'issue' | 'solution' | 'case_study'
  // Whether the viewer can apply directly (owner/admin) — only changes copy.
  canApply: boolean
  issue?: IssueNode | null
  caseStudy?: CaseStudyNode | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submitted: []
}>()

const { track } = useUmami()
const toast = useToast()

const submitting = ref(false)
const error = ref('')
const note = ref('')

const isCaseStudy = computed(() => props.kind === 'case_study')
const isSolution = computed(() => props.kind === 'solution')

// --- Issue / solution form state -----------------------------------------
const title = ref('')
const summary = ref('')
const description = ref('')
const locationName = ref('')
const latitude = ref<number | undefined>()
const longitude = ref<number | undefined>()
const scale = ref<LocationScale | undefined>()
const solutionStatus = ref<SolutionStatus | undefined>()
const links = ref<IssueLinkRow[]>([])

// --- Case-study form state -----------------------------------------------
const outcome = ref<CaseStudyOutcome | undefined>()
const csLocationName = ref('')
const csLatitude = ref<number | undefined>()
const csLongitude = ref<number | undefined>()
const csScale = ref<LocationScale | undefined>()
const implementer = ref('')
const startDate = ref('')
const endDate = ref('')
const csDescription = ref('')
const cost = ref<number | undefined>()
const currency = ref('')
const fundingSource = ref('')
const lessons = ref<CaseStudyLessonRow[]>([])
const sources = ref<CaseStudyLinkRow[]>([])
const csLinks = ref<CaseStudyLinkRow[]>([])
const metrics = ref<CaseStudyMetricRow[]>([])

// --- Reparent ------------------------------------------------------------
const newParentId = ref<number | null>(null)

// Seed the form when the modal opens. Snapshots are taken so we only PATCH the
// fields the user actually changed (the endpoint also no-ops a no-change diff).
watch(() => props.open, (v) => {
  if (!v) return
  error.value = ''
  note.value = ''
  newParentId.value = null

  if (!isCaseStudy.value && props.issue) {
    const n = props.issue
    title.value = n.title
    summary.value = n.summary
    description.value = n.description ?? ''
    locationName.value = n.locationName ?? ''
    latitude.value = n.location?.latitude
    longitude.value = n.location?.longitude
    scale.value = n.scale ?? undefined
    solutionStatus.value = n.solutionStatus ?? undefined
    links.value = (n.links ?? []).map(l => ({ url: l.url, title: l.title ?? '' }))
  }
  else if (isCaseStudy.value && props.caseStudy) {
    const n = props.caseStudy
    outcome.value = n.outcome
    csLocationName.value = n.locationName ?? ''
    csLatitude.value = n.location?.latitude
    csLongitude.value = n.location?.longitude
    csScale.value = n.scale ?? undefined
    implementer.value = n.implementer ?? ''
    startDate.value = n.startDate ?? ''
    endDate.value = n.endDate ?? ''
    csDescription.value = n.description ?? ''
    cost.value = n.cost != null ? Number(n.cost) : undefined
    currency.value = n.currency ?? ''
    fundingSource.value = n.fundingSource ?? ''
    lessons.value = (n.lessonsLearned ?? []).map(s => ({ text: s }))
    sources.value = (n.sources ?? []).map(s => ({ url: s.url, title: s.title ?? '' }))
    csLinks.value = (n.links ?? []).map(l => ({ url: l.url, title: l.title ?? '' }))
    metrics.value = (n.metrics ?? []).map(m => ({
      label: m.label,
      baseline: m.baseline ?? '',
      result: m.result ?? '',
      unit: m.unit ?? '',
    }))
  }
})

function close() {
  if (submitting.value) return
  emit('update:open', false)
}

// Build the issue PATCH body. Mirrors pages/new.vue's submit cleaning for links;
// every field is forwarded (the server diffs against the live node and records
// only real changes / no-ops an empty diff).
function buildIssueBody() {
  const cleanedLinks = links.value
    .map(l => ({ url: l.url.trim(), title: l.title.trim() || undefined }))
    .filter(l => l.url)
  const body: Record<string, unknown> = {
    title: title.value.trim(),
    summary: summary.value.trim(),
    description: description.value.trim() || null,
    locationName: locationName.value.trim() || null,
    latitude: latitude.value ?? null,
    longitude: longitude.value ?? null,
    scale: scale.value ?? null,
    note: note.value.trim() || null,
  }
  if (isSolution.value) {
    body.solutionStatus = solutionStatus.value ?? null
    body.links = cleanedLinks
  }
  if (newParentId.value != null) body.parentId = newParentId.value
  return body
}

// Build the case-study PATCH body. Mirrors pages/new-case-study.vue's submit
// cleaning (sources/links/metrics trimmed + filtered, lessons rows → string[]).
function buildCaseStudyBody() {
  const cleanedSources = sources.value
    .map(s => ({ url: s.url.trim(), title: s.title.trim() || undefined }))
    .filter(s => s.url)
  const cleanedLinks = csLinks.value
    .map(l => ({ url: l.url.trim(), title: l.title.trim() || undefined }))
    .filter(l => l.url)
  const cleanedMetrics = metrics.value
    .map(m => ({
      label: m.label.trim(),
      baseline: m.baseline.trim() || undefined,
      result: m.result.trim() || undefined,
      unit: m.unit.trim() || undefined,
    }))
    .filter(m => m.label)
  const cleanedLessons = lessons.value.map(l => l.text.trim()).filter(Boolean)

  const body: Record<string, unknown> = {
    outcome: outcome.value,
    locationName: csLocationName.value.trim(),
    latitude: csLatitude.value ?? null,
    longitude: csLongitude.value ?? null,
    scale: csScale.value ?? null,
    implementer: implementer.value.trim() || null,
    startDate: startDate.value || null,
    endDate: endDate.value || null,
    description: csDescription.value.trim() || null,
    cost: cost.value ?? null,
    currency: currency.value.trim() || null,
    fundingSource: fundingSource.value.trim() || null,
    lessonsLearned: cleanedLessons,
    sources: cleanedSources,
    links: cleanedLinks,
    metrics: cleanedMetrics,
    note: note.value.trim() || null,
  }
  if (newParentId.value != null) body.solutionId = newParentId.value
  return body
}

async function submit() {
  if (submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    let applied = false
    if (!isCaseStudy.value && props.issue) {
      if (!title.value.trim()) throw new Error('Title cannot be empty')
      if (!summary.value.trim()) throw new Error('Summary cannot be empty')
      const res = await $fetch(`/api/issue/${props.issue.id}`, {
        method: 'PATCH' as const,
        body: buildIssueBody(),
      })
      applied = res.applied
    }
    else if (isCaseStudy.value && props.caseStudy) {
      if (!csLocationName.value.trim()) throw new Error('Location is required')
      if (!outcome.value) throw new Error('Outcome is required')
      const res = await $fetch(`/api/case-study/${props.caseStudy.id}`, {
        method: 'PATCH' as const,
        body: buildCaseStudyBody(),
      })
      applied = res.applied
    }

    track(props.canApply ? 'Edit node' : 'Suggest edit', { kind: props.kind })

    if (applied) {
      toast.add({ title: 'Saved', description: 'Your changes are live.', color: 'success' })
    }
    else {
      toast.add({
        title: 'Suggestion submitted for review',
        description: 'The owner will be notified and can accept or decline it.',
        color: 'success',
      })
    }
    emit('submitted')
    emit('update:open', false)
  }
  catch (err: unknown) {
    const status = (err as { statusCode?: number, response?: { status?: number } })?.statusCode
      ?? (err as { response?: { status?: number } })?.response?.status
    const message = (err as { data?: { message?: string }, message?: string })?.data?.message
      ?? (err as { message?: string })?.message
    if (status === 400) {
      error.value = message || 'No changes to save.'
    }
    else if (status === 429) {
      error.value = 'You are proposing edits too quickly — please try again later.'
    }
    else {
      error.value = message || 'Failed to save'
    }
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal :open="open" @update:open="emit('update:open', $event)">
    <template #content>
      <div class="p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
        <div class="mb-4 space-y-1">
          <h3 class="text-lg font-medium">
            {{ canApply ? 'Edit' : 'Suggest an edit' }}
          </h3>
          <p class="text-xs text-toned">
            <template v-if="canApply">
              Changes apply immediately and are recorded in this node's history.
            </template>
            <template v-else>
              Your suggestion is sent to the owner for review — the live page stays unchanged until they accept it.
            </template>
          </p>
        </div>

        <form class="grid gap-4" @submit.prevent="submit">
          <IssueFields
            v-if="!isCaseStudy"
            v-model:title="title"
            v-model:summary="summary"
            v-model:description="description"
            v-model:location-name="locationName"
            v-model:latitude="latitude"
            v-model:longitude="longitude"
            v-model:scale="scale"
            v-model:solution-status="solutionStatus"
            v-model:links="links"
            :kind="isSolution ? 'solution' : 'issue'"
            :show-solution-status="true"
          />

          <CaseStudyFields
            v-else
            v-model:outcome="outcome"
            v-model:location-name="csLocationName"
            v-model:latitude="csLatitude"
            v-model:longitude="csLongitude"
            v-model:scale="csScale"
            v-model:implementer="implementer"
            v-model:start-date="startDate"
            v-model:end-date="endDate"
            v-model:description="csDescription"
            v-model:cost="cost"
            v-model:currency="currency"
            v-model:funding-source="fundingSource"
            v-model:lessons="lessons"
            v-model:sources="sources"
            v-model:links="csLinks"
            v-model:metrics="metrics"
          />

          <RevisionParentPicker
            v-if="!isCaseStudy && issue"
            v-model="newParentId"
            :mode="isSolution ? 'solution' : 'issue'"
            :current-node-id="issue.id"
            :current-parent-id="issue.parentId ?? null"
          />
          <RevisionParentPicker
            v-else-if="isCaseStudy && caseStudy"
            v-model="newParentId"
            mode="case_study"
            :current-node-id="caseStudy.id"
            :current-parent-id="caseStudy.solutionId"
          />

          <UFormField
            label="Note"
            name="note"
            :hint="canApply ? 'Optional changelog entry' : 'Optional — explain your change to the owner'"
          >
            <UTextarea
              v-model="note"
              placeholder="What did you change and why?"
              :rows="2"
              class="w-full"
            />
          </UFormField>

          <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" :disabled="submitting" @click="close">
              Cancel
            </UButton>
            <UButton type="submit" color="primary" :loading="submitting">
              {{ canApply ? 'Save changes' : 'Submit suggestion' }}
            </UButton>
          </div>
        </form>
      </div>
    </template>
  </UModal>
</template>
