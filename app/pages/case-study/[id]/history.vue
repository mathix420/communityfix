<script setup lang="ts">
import type { SerializedRevision } from '../../../../server/utils/revision-write'

// Version history for a case study: a diffable timeline of every change
// (born-approved edits + accepted suggestions are public; pending/rejected ones
// are surfaced only to the owner, an admin, or the proposer — the endpoint
// already filters). Owner/admin can approve/reject pending proposals inline; the
// proposer can withdraw their own.
const route = useRoute()
const id = computed(() => route.params.id as string)

// The parent [id].vue shell already loaded the study and provided both it and
// the server-resolved ownership flag.
const canApply = inject<Ref<boolean>>('caseStudyCanApply', ref(false))
const onEdited = inject<() => Promise<void> | void>('caseStudyRefresh', () => {})

const { user, loggedIn } = useUserSession()

const { data: revisions, refresh } = await useFetch<SerializedRevision[]>(
  () => `/api/case-study/${id.value}/revisions`,
  { default: () => [] },
)

// Derived values kept in script so the template stays flat (no inline ternaries
// / optional chains for the complexity budget to trip over).
const revisionCount = computed(() => revisions.value.length)
const viewerId = computed(() => (loggedIn.value ? (user.value?.id ?? null) : null))

async function onChanged() {
  await Promise.all([refresh(), onEdited()])
}
</script>

<template>
  <div class="mt-3 space-y-4">
    <NodeBackLink label="Back to case study" :to="`/case-study/${id}`" />
    <div class="flex items-baseline gap-3">
      <UiSectionTitle>
        History
      </UiSectionTitle>
      <span v-if="revisionCount" class="font-mono text-[10px] text-gray-400 tracking-widest">
        · {{ revisionCount }}
      </span>
    </div>
    <RevisionTimeline
      :can-decide="canApply"
      :revisions="revisions"
      :viewer-id="viewerId"
      @changed="onChanged"
    />
  </div>
</template>
