<script setup lang="ts">
// Edit-then-approve modal. Lets the admin tweak title/summary/description
// (or case-study fields) inside the queue rather than rejecting back to
// the author over a fixable issue. The audit log gets the diff.
interface IssueLike {
  id: number
  title: string
  summary: string
  description?: string | null
  type?: 'issue' | 'solution'
}
interface CaseStudyLike {
  id: number
  description?: string | null
  implementer?: string | null
  locationName: string
  outcome: 'success' | 'partial' | 'failed' | 'inconclusive' | 'ongoing'
}

const props = defineProps<{
  open: boolean
  kind: 'issue' | 'case-study'
  issue?: IssueLike | null
  caseStudy?: CaseStudyLike | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submitted: []
}>()

const submitting = ref(false)
const error = ref('')

// Form state — initialized when the modal opens.
const title = ref('')
const summary = ref('')
const description = ref('')
const type = ref<'issue' | 'solution'>('issue')

const csDescription = ref('')
const csImplementer = ref('')
const csLocationName = ref('')
const csOutcome = ref<'success' | 'partial' | 'failed' | 'inconclusive' | 'ongoing'>('ongoing')

const outcomeOptions = [
  { label: 'Success', value: 'success' },
  { label: 'Partial', value: 'partial' },
  { label: 'Failed', value: 'failed' },
  { label: 'Inconclusive', value: 'inconclusive' },
  { label: 'Ongoing', value: 'ongoing' },
]
const typeOptions = [
  { label: 'Issue', value: 'issue' },
  { label: 'Solution', value: 'solution' },
]

watch(() => props.open, (v) => {
  if (!v) return
  error.value = ''
  if (props.kind === 'issue' && props.issue) {
    title.value = props.issue.title
    summary.value = props.issue.summary
    description.value = props.issue.description ?? ''
    type.value = props.issue.type ?? 'issue'
  }
  else if (props.kind === 'case-study' && props.caseStudy) {
    csDescription.value = props.caseStudy.description ?? ''
    csImplementer.value = props.caseStudy.implementer ?? ''
    csLocationName.value = props.caseStudy.locationName
    csOutcome.value = props.caseStudy.outcome
  }
})

const summaryLen = computed(() => summary.value.length)
const summaryTooLong = computed(() => summaryLen.value > 280)

function close() {
  if (submitting.value) return
  emit('update:open', false)
}

async function submit() {
  if (submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    if (props.kind === 'issue' && props.issue) {
      if (!title.value.trim()) throw new Error('Title cannot be empty')
      if (!summary.value.trim()) throw new Error('Summary cannot be empty')
      if (summaryTooLong.value) throw new Error('Summary exceeds 280 characters')
      await $fetch(`/api/admin/issues/${props.issue.id}/approve`, {
        method: 'POST' as const,
        body: {
          reason: 'Admin edited and approved',
          edits: {
            title: title.value.trim(),
            summary: summary.value.trim(),
            description: description.value.trim() || null,
            type: type.value,
          },
        },
      })
    }
    else if (props.kind === 'case-study' && props.caseStudy) {
      if (!csLocationName.value.trim()) throw new Error('Location is required')
      await $fetch(`/api/admin/case-study/${props.caseStudy.id}/approve`, {
        method: 'POST' as const,
        body: {
          reason: 'Admin edited and approved',
          edits: {
            description: csDescription.value.trim() || null,
            implementer: csImplementer.value.trim() || null,
            locationName: csLocationName.value.trim(),
            outcome: csOutcome.value,
          },
        },
      })
    }
    emit('submitted')
    emit('update:open', false)
  }
  catch (err: unknown) {
    error.value = (err as { data?: { message?: string }, message?: string })?.data?.message
      ?? (err as { message?: string })?.message
      ?? 'Failed to save'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal :open="open" @update:open="emit('update:open', $event)">
    <template #content>
      <div class="p-4 space-y-3">
        <h3 class="font-medium">Edit & approve</h3>
        <p class="text-xs text-toned">Changes are recorded in the audit log alongside the approval.</p>

        <template v-if="kind === 'issue' && issue">
          <label class="block">
            <span class="text-xs font-medium text-toned">Title</span>
            <UInput v-model="title" class="mt-1 w-full" />
          </label>
          <label class="block">
            <span class="text-xs font-medium text-toned">Summary</span>
            <UTextarea v-model="summary" :rows="2" class="mt-1 w-full" />
            <span class="text-[11px]" :class="summaryTooLong ? 'text-red-600' : 'text-toned'">
              {{ summaryLen }} / 280
            </span>
          </label>
          <label class="block">
            <span class="text-xs font-medium text-toned">Description</span>
            <UTextarea v-model="description" :rows="4" class="mt-1 w-full" />
          </label>
          <label class="block">
            <span class="text-xs font-medium text-toned">Type</span>
            <USelectMenu v-model="type" :items="typeOptions" value-key="value" class="mt-1 w-40" />
          </label>
        </template>

        <template v-else-if="kind === 'case-study' && caseStudy">
          <label class="block">
            <span class="text-xs font-medium text-toned">Location</span>
            <UInput v-model="csLocationName" class="mt-1 w-full" />
          </label>
          <label class="block">
            <span class="text-xs font-medium text-toned">Outcome</span>
            <USelectMenu v-model="csOutcome" :items="outcomeOptions" value-key="value" class="mt-1 w-48" />
          </label>
          <label class="block">
            <span class="text-xs font-medium text-toned">Implementer</span>
            <UInput v-model="csImplementer" class="mt-1 w-full" />
          </label>
          <label class="block">
            <span class="text-xs font-medium text-toned">Description</span>
            <UTextarea v-model="csDescription" :rows="5" class="mt-1 w-full" />
          </label>
        </template>

        <p v-if="error" class="text-xs text-red-600">{{ error }}</p>

        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" :disabled="submitting" @click="close">Cancel</UButton>
          <UButton color="primary" :loading="submitting" @click="submit">Save & approve</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
