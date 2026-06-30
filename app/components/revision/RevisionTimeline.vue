<script setup lang="ts">
import type { SerializedRevision } from '../../../server/utils/revision-write'
import type { RevisionStatus } from '../../../server/database/schema'

// Shared revision history timeline. Renders a list of SerializedRevision rows
// (newest first, as the endpoints return them) as AdminQueueCard rows — each
// shows the proposer, a status badge, relative time, the rationale note, and the
// field-by-field <RevisionDiff>. Owner/admin see Approve/Reject on pending rows;
// the proposer sees Withdraw on their own pending rows. Decisions go straight to
// the revision endpoints and the parent refreshes via the `changed` emit.
//
// Used by the issue History tab and the case-study History section so the
// review affordances stay identical across node kinds.

const props = defineProps<{
  revisions: SerializedRevision[]
  // Whether the viewer can approve/reject (node author or admin).
  canDecide: boolean
  // The current viewer's id — controls the proposer-only Withdraw button.
  viewerId?: string | null
}>()

const emit = defineEmits<{
  // A decision/withdraw settled — parent should refetch the node + revisions.
  changed: []
}>()

const { track } = useUmami()
const toast = useToast()
const { run, isPending } = useAdminAction()

const statusVariant: Record<RevisionStatus, 'default' | 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  withdrawn: 'default',
  superseded: 'default',
}

function formatRelative(date: string | null | undefined) {
  if (!date) return ''
  const d = new Date(date)
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 30) return `${diffD}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Reject flows through the shared modal so the reviewer can pick a preset reason.
const rejectOpen = ref(false)
const rejectTarget = ref<SerializedRevision | null>(null)

function openReject(rev: SerializedRevision) {
  rejectTarget.value = rev
  rejectOpen.value = true
}

async function approve(rev: SerializedRevision) {
  const res = await run(`approve-${rev.id}`, () =>
    $fetch(`/api/revisions/${rev.id}/approve`, { method: 'POST' as const, body: {} }),
  )
  if (res) {
    track('Approve revision', { revisionId: rev.id })
    toast.add({
      title: 'Suggestion approved',
      description: 'The change has been applied.',
      color: 'success',
    })
    emit('changed')
  } else {
    toast.add({ title: 'Failed to approve', color: 'error' })
  }
}

async function reject(reason: string) {
  const rev = rejectTarget.value
  if (!rev) return
  const res = await run(`reject-${rev.id}`, () =>
    $fetch(`/api/revisions/${rev.id}/reject`, { method: 'POST' as const, body: { reason } }),
  )
  rejectOpen.value = false
  if (res) {
    track('Reject revision', { revisionId: rev.id })
    toast.add({ title: 'Suggestion rejected', color: 'success' })
    emit('changed')
  } else {
    toast.add({ title: 'Failed to reject', color: 'error' })
  }
}

async function withdraw(rev: SerializedRevision) {
  const res = await run(`withdraw-${rev.id}`, () =>
    $fetch(`/api/revisions/${rev.id}/withdraw`, { method: 'POST' as const }),
  )
  if (res) {
    track('Withdraw revision', { revisionId: rev.id })
    toast.add({ title: 'Suggestion withdrawn', color: 'success' })
    emit('changed')
  } else {
    toast.add({ title: 'Failed to withdraw', color: 'error' })
  }
}

function canWithdraw(rev: SerializedRevision) {
  return rev.status === 'pending' && !!props.viewerId && rev.proposer?.id === props.viewerId
}

// Suffix an "(admin)" tag when a decision was made by an admin who isn't the
// node owner, so the history line reads e.g. "approved by Dana (admin) 2h ago".
function decidedRoleLabel(rev: SerializedRevision) {
  if (!rev.decidedBy) return ''
  return rev.decidedByRole === 'admin' ? ' (admin)' : ''
}
</script>

<template>
  <div>
    <div v-if="revisions.length" class="space-y-2">
      <AdminQueueCard v-for="rev in revisions" :key="rev.id" :since="rev.createdAt">
        <template #header>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-medium">
              {{
                rev.note ||
                  (rev.changes && Object.keys(rev.changes).length === 1
                    ? 'Edited 1 field'
                    : `Edited ${Object.keys(rev.changes || {}).length} fields`)
              }}
            </span>
            <UiBadge :variant="statusVariant[rev.status]">
              {{ rev.status }}
            </UiBadge>
            <UiBadge
              v-if="rev.aiVerdict && rev.aiVerdict !== 'ok'"
              variant="error"
              :title="rev.aiReason ?? undefined"
            >
              AI: {{ rev.aiVerdict }}
            </UiBadge>
          </div>
          <p class="text-xs text-toned">
            {{ rev.proposer?.name || 'Anonymous' }} · {{ formatRelative(rev.createdAt) }}
            <template v-if="rev.decidedAt">
              · {{ rev.status }} by {{ rev.decidedBy?.name || 'a reviewer' }}{{ decidedRoleLabel(rev) }} {{ formatRelative(rev.decidedAt) }}
            </template>
          </p>
          <p v-if="rev.decisionReason" class="text-xs text-toned italic">
            “{{ rev.decisionReason }}”
          </p>
        </template>
        <template #preview>
          <RevisionDiff
            :after="rev.appliedSnapshot ?? {}"
            :before="rev.baseSnapshot"
            :changes="rev.changes"
          />
        </template>
        <template v-if="rev.status === 'pending' && (canDecide || canWithdraw(rev))" #actions>
          <template v-if="canDecide">
            <UButton
              color="primary"
              size="xs"
              :loading="isPending(`approve-${rev.id}`)"
              @click="approve(rev)"
            >
              Approve
            </UButton>
            <UButton
              color="error"
              size="xs"
              variant="ghost"
              :disabled="isPending(`reject-${rev.id}`)"
              @click="openReject(rev)"
            >
              Reject
            </UButton>
          </template>
          <UButton
            v-if="canWithdraw(rev)"
            color="neutral"
            size="xs"
            variant="ghost"
            :loading="isPending(`withdraw-${rev.id}`)"
            @click="withdraw(rev)"
          >
            Withdraw
          </UButton>
        </template>
      </AdminQueueCard>
    </div>
    <UiEmptyState
      v-else
      description="Edits and accepted suggestions will appear here as a diffable timeline."
      icon="lucide:history"
      title="No history yet"
    />
    <AdminRejectModal
      v-model:open="rejectOpen"
      title="Reject suggestion"
      :target="rejectTarget?.note || undefined"
      @submit="reject"
    />
  </div>
</template>
