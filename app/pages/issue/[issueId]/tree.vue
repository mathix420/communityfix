<script setup lang="ts">
import type { TreeNode } from '../../../../server/api/issue/[id]/tree.get'

interface NestedNode extends TreeNode {
  children: NestedNode[]
}

const route = useRoute()
const { track } = useUmami()
const issueId = computed(() => route.params.issueId as string)
const DEFAULT_EXPANDED_DEPTH = 5

const { data: flatNodes, pending } = await useFetch<TreeNode[]>(
  () => `/api/issue/${issueId.value}/tree`,
)

// Build the nested structure from the flat CTE output. Children of the
// current page's issue are at depth=1 (the CTE excludes the root itself).
// Case-study rows can appear once under every linked solution. Keep each edge
// as its own node and use an issue-only index to resolve solution parents.
const rootChildren = computed<NestedNode[]>(() => {
  const rows = flatNodes.value
  if (!rows || rows.length === 0) return []

  const issueById = new Map<number, NestedNode>()
  const nodes = rows.map((row): NestedNode => ({ ...row, children: [] }))
  for (const node of nodes) {
    if (node.type !== 'case-study') issueById.set(node.id, node)
  }

  const roots: NestedNode[] = []
  const rootParentId = Number(issueId.value)
  for (const node of nodes) {
    // Direct children of the page's node sit at the root of the panel: for an
    // issue these are sub-issues/solutions, for a solution they're its own
    // case studies. Their parentId points at the (excluded) root, so there's
    // no parent row to attach to.
    if (node.parentId === rootParentId) {
      roots.push(node)
      continue
    }
    const parent = node.parentId != null ? issueById.get(node.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node) // orphan from depth truncation — keep it visible
  }
  return roots
})

const totalNodes = computed(() => flatNodes.value?.length ?? 0)

// Broadcast channel for the expand/collapse toggle. Nodes watch the signal
// ref and set their local expanded state to `target`.
const expandAllSignal = ref(0)
const expandAllTarget = ref(true)
const treeHorizontalScrolled = ref(false)
provide('tree-expand-all-signal', expandAllSignal)
provide('tree-expand-all-target', expandAllTarget)
provide('tree-horizontal-scrolled', treeHorizontalScrolled)

function onTreeScroll(event: Event) {
  treeHorizontalScrolled.value = (event.currentTarget as HTMLElement).scrollLeft > 0
}

function toggleAll() {
  expandAllTarget.value = !expandAllTarget.value
  expandAllSignal.value++
  track(expandAllTarget.value ? 'Tree expand all' : 'Tree collapse all', {
    issueId: Number(issueId.value),
  })
}
</script>

<template>
  <div class="mt-4 flex flex-col max-w-3xl mx-auto gap-4">
    <div v-if="rootChildren.length > 0" class="flex items-center justify-between gap-2">
      <p class="text-xs text-toned font-mono">
        {{ totalNodes }} {{ totalNodes === 1 ? 'node' : 'nodes' }}
      </p>
      <UButton
        size="sm"
        variant="ghost"
        :icon="expandAllTarget ? 'lucide:chevrons-up' : 'lucide:chevrons-down'"
        @click="toggleAll"
      >
        {{ expandAllTarget ? 'Collapse all' : 'Expand all' }}
      </UButton>
    </div>
    <UiCard
      v-if="rootChildren.length > 0"
      class="min-w-0 max-w-full overflow-hidden sm:overflow-visible"
      padding="md"
    >
      <div class="w-full min-w-0 overflow-x-auto sm:overflow-visible" @scroll="onTreeScroll">
        <div class="min-w-[36rem] sm:min-w-0">
          <IssueTreeNode
            v-for="node in rootChildren"
            :key="`${node.type}:${node.id}:${node.parentId}`"
            :default-expanded-depth="DEFAULT_EXPANDED_DEPTH"
            :depth="1"
            :node="node"
          />
        </div>
      </div>
    </UiCard>
    <p v-else-if="!pending" class="text-toned text-center py-8">
      No children yet.
    </p>
  </div>
</template>
