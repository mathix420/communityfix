<script setup lang="ts">
// Collapsed-by-default control to propose moving a node under a different
// parent. Issues/solutions reparent under another issue (the target must be an
// issue, never a solution — solutions can't nest). Case studies re-attach to a
// different solution (the target must be a solution).
//
// There is no public search endpoint that covers sub-issues/solutions, so this
// uses a validated numeric-id lookup against GET /api/issue/[id]: the user pastes
// the target node's id (shown as `#00042` on every node page), we fetch it and
// confirm the kind matches, then surface the title for confirmation. Emits the
// chosen id via v-model (null = leave the parent unchanged).

const props = defineProps<{
  // 'issue' → pick a parent issue (must be type 'issue').
  // 'solution' → pick a parent issue for a solution (must be type 'issue').
  // 'case_study' → pick a target solution (must be type 'solution').
  mode: 'issue' | 'solution' | 'case_study'
  // The node being moved — excluded from its own parent set (no self-parent).
  currentNodeId: number
  // The node's current parent/solution id, shown as the starting point.
  currentParentId: number | null
}>()

// The chosen new parent/solution id, or null to leave unchanged.
const model = defineModel<number | null>({ default: null })

const expanded = ref(false)
const idInput = ref('')
const checking = ref(false)
const error = ref('')
// The resolved, validated target (title for confirmation).
const resolved = ref<{ id: number, title: string } | null>(null)

// What kind the picked target must be, and how we label it.
const wantSolution = computed(() => props.mode === 'case_study')
const targetLabel = computed(() => (wantSolution.value ? 'solution' : 'parent issue'))

async function lookup() {
  error.value = ''
  resolved.value = null
  model.value = null
  const id = Number(idInput.value)
  if (!Number.isInteger(id) || id <= 0) {
    error.value = 'Enter a numeric node id.'
    return
  }
  if (id === props.currentNodeId) {
    error.value = "A node can't be its own parent."
    return
  }
  if (id === props.currentParentId) {
    error.value = `That's already the current ${targetLabel.value}.`
    return
  }
  checking.value = true
  try {
    const node = await $fetch(`/api/issue/${id}`)
    if (!node) {
      error.value = `No node found with id #${id}.`
      return
    }
    if (wantSolution.value && node.type !== 'solution') {
      error.value = 'The target must be a solution.'
      return
    }
    if (!wantSolution.value && node.type === 'solution') {
      error.value = "Can't nest under a solution — pick an issue."
      return
    }
    resolved.value = { id: node.id, title: node.title }
    model.value = node.id
  }
  catch {
    error.value = `Couldn't load node #${id}.`
  }
  finally {
    checking.value = false
  }
}

function clearChoice() {
  idInput.value = ''
  resolved.value = null
  error.value = ''
  model.value = null
}
</script>

<template>
  <section class="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
    <button
      type="button"
      class="flex w-full items-center gap-2 text-left text-sm font-medium text-gray-700"
      @click="expanded = !expanded"
    >
      <UIcon
        name="lucide:chevron-right"
        class="size-4 text-gray-400 transition-transform"
        :class="{ 'rotate-90': expanded }"
      />
      <UIcon name="lucide:git-fork" class="size-4 text-gray-400" />
      Move under a different {{ targetLabel }}
      <span v-if="resolved" class="ml-auto font-mono text-xs text-primary-700">→ #{{ resolved.id }}</span>
    </button>

    <div v-if="expanded" class="space-y-2 pl-6">
      <p class="text-xs text-toned">
        Paste the id of the new {{ targetLabel }} (the
        <span class="font-mono">#00000</span> number on its page). Leave blank to keep the current one.
      </p>

      <div class="flex items-center gap-2">
        <UInput
          v-model="idInput"
          type="number"
          placeholder="e.g. 42"
          size="sm"
          class="w-32"
          @keydown.enter.prevent="lookup"
        />
        <UButton
          size="sm"
          variant="soft"
          color="neutral"
          :loading="checking"
          :disabled="!idInput.trim()"
          @click="lookup"
        >
          Check
        </UButton>
        <UButton
          v-if="resolved || idInput"
          size="sm"
          variant="ghost"
          color="neutral"
          @click="clearChoice"
        >
          Clear
        </UButton>
      </div>

      <p v-if="error" class="text-xs text-red-600">{{ error }}</p>

      <p v-else-if="resolved" class="text-xs text-green-700 inline-flex items-center gap-1.5">
        <UIcon name="lucide:check-circle" class="size-3.5" />
        Will move under
        <span class="font-mono">#{{ resolved.id }}</span>
        <span class="truncate font-medium">{{ resolved.title }}</span>
      </p>
    </div>
  </section>
</template>
