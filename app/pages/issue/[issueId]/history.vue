<script setup lang="ts">
import type { SerializedRevision } from '../../../../server/utils/revision-write'

// Version history for an issue / solution: a diffable timeline of every change
// (born-approved edits + accepted suggestions are public; pending/rejected ones
// are surfaced only to the owner, an admin, or the proposer — the endpoint
// already filters). Owner/admin can approve/reject pending proposals inline; the
// proposer can withdraw their own.
const route = useRoute()
const issueId = computed(() => route.params.issueId as string)

// The parent route already loaded the issue and provided it; reuse its
// server-resolved ownership flag (node_members-based).
const issue =
  inject<Ref<{ id: number; authorId: string | null; viewerIsOwner?: boolean } | null>>('issue')

const { user, loggedIn } = useUserSession()
const { isAdmin } = usePendingRevisions()

const { data: revisions, refresh } = await useFetch<SerializedRevision[]>(
  () => `/api/issue/${issueId.value}/revisions`,
  { default: () => [] },
)

const isOwner = computed(() => !!issue?.value?.viewerIsOwner)
const canDecide = computed(() => isOwner.value || isAdmin.value)
</script>

<template>
  <div class="mt-3">
    <RevisionTimeline
      :can-decide="canDecide"
      :revisions="revisions ?? []"
      :viewer-id="loggedIn ? user?.id : null"
      @changed="refresh"
    />
  </div>
</template>
