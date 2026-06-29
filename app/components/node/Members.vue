<script setup lang="ts">
// Owners + collaborators panel for a node detail page. Everyone sees who
// maintains and who has contributed; owners/admins additionally get controls to
// promote a collaborator to co-owner or step an owner back down. A node always
// keeps at least one owner (enforced server-side).
const props = defineProps<{
  kind: 'issue' | 'case_study'
  nodeId: number
  // When the panel is the whole point of the view (e.g. a dedicated Contributors
  // page) always render it, even for a lone owner. Inline placements leave this
  // off so a single-owner node stays uncluttered.
  alwaysShow?: boolean
}>()

const { track } = useUmami()
const toast = useToast()

interface Member {
  id: string | null
  name: string
  role: 'owner' | 'collaborator'
  source: string | null
  changes: number
}
interface MembersResponse {
  owners: Member[]
  collaborators: Member[]
  viewer: { canManage: boolean, isOwner: boolean, isAdmin: boolean }
}

const base = computed(() =>
  props.kind === 'issue' ? `/api/issue/${props.nodeId}/members` : `/api/case-study/${props.nodeId}/members`,
)

const { data } = await useFetch<MembersResponse>(base, {
  key: `members-${props.kind}-${props.nodeId}`,
  default: () => ({ owners: [], collaborators: [], viewer: { canManage: false, isOwner: false, isAdmin: false } }),
})

const canManage = computed(() => data.value?.viewer.canManage ?? false)
const ownerCount = computed(() => data.value?.owners.length ?? 0)

// Hide the panel entirely when there's nothing worth showing — a lone owner and
// no contributors — unless the viewer can manage members (then they need it).
const showPanel = computed(() =>
  props.alwaysShow || canManage.value || ownerCount.value > 1 || (data.value?.collaborators.length ?? 0) > 0,
)

const busyId = ref<string | null>(null)

async function setRole(member: Member, role: 'owner' | 'collaborator') {
  if (!member.id) return
  busyId.value = member.id
  try {
    data.value = await $fetch<MembersResponse>(base.value, { method: 'POST', body: { userId: member.id, role } })
    track(role === 'owner' ? 'Promote to owner' : 'Step down owner', { kind: props.kind, nodeId: props.nodeId })
  }
  catch (err: unknown) {
    const description = (err as { statusMessage?: string })?.statusMessage || 'Please try again'
    toast.add({ title: 'Could not update member', description, color: 'error' })
  }
  finally {
    busyId.value = null
  }
}

function avatarUrl(m: Member) {
  return `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(m.id || m.name)}`
}
</script>

<template>
  <div v-if="showPanel" class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6">
    <!-- Owners -->
    <div>
      <div class="flex items-center gap-2 mb-2.5">
        <UIcon name="lucide:user-check" class="size-4 text-gray-400" />
        <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
          {{ ownerCount > 1 ? 'Owners' : 'Owner' }}
        </p>
      </div>
      <ul class="flex flex-col gap-1.5">
        <li v-for="m in data?.owners" :key="m.id || m.name" class="flex items-center gap-2">
          <img :src="avatarUrl(m)" :alt="m.name" class="size-6 rounded-full bg-gray-100 shrink-0">
          <NuxtLink v-if="m.id" :to="`/user/${m.id}`" class="text-sm hover:underline truncate">{{ m.name }}</NuxtLink>
          <span v-else class="text-sm truncate text-gray-700">{{ m.name }}</span>
          <span v-if="m.changes" class="text-[11px] font-mono text-gray-400 whitespace-nowrap">
            {{ m.changes }} {{ m.changes === 1 ? 'edit' : 'edits' }}
          </span>
          <button
            v-if="canManage && ownerCount > 1 && m.id"
            type="button"
            :disabled="busyId === m.id"
            class="ml-auto text-[11px] font-mono text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
            @click="setRole(m, 'collaborator')"
          >
            Step down
          </button>
        </li>
      </ul>
    </div>

    <!-- Collaborators -->
    <div v-if="data?.collaborators.length" class="mt-6">
      <div class="flex items-center gap-2 mb-2.5">
        <UIcon name="lucide:users" class="size-4 text-gray-400" />
        <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
          Contributors
        </p>
      </div>
      <ul class="flex flex-col gap-1.5">
        <li v-for="m in data.collaborators" :key="m.id || m.name" class="flex items-center gap-2">
          <img :src="avatarUrl(m)" :alt="m.name" class="size-6 rounded-full bg-gray-100 shrink-0">
          <NuxtLink v-if="m.id" :to="`/user/${m.id}`" class="text-sm hover:underline truncate">{{ m.name }}</NuxtLink>
          <span v-else class="text-sm truncate text-gray-700">{{ m.name }}</span>
          <span v-if="m.changes" class="text-[11px] font-mono text-gray-400 whitespace-nowrap">
            {{ m.changes }} {{ m.changes === 1 ? 'edit' : 'edits' }}
          </span>
          <button
            v-if="canManage && m.id"
            type="button"
            :disabled="busyId === m.id"
            class="ml-auto text-[11px] font-mono text-primary-600 hover:text-primary-800 transition-colors disabled:opacity-50"
            @click="setRole(m, 'owner')"
          >
            Make owner
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
