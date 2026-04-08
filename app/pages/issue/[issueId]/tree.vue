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
const rootChildren = computed<NestedNode[]>(() => {
  const rows = flatNodes.value
  if (!rows || rows.length === 0) return []

  const byId = new Map<number, NestedNode>()
  for (const row of rows) {
    byId.set(row.id, { ...row, children: [] })
  }

  const roots: NestedNode[] = []
  const rootParentId = Number(issueId.value)
  for (const node of byId.values()) {
    if (node.parentId === rootParentId) {
      roots.push(node)
      continue
    }
    const parent = node.parentId != null ? byId.get(node.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node) // orphan from depth truncation — keep it visible
  }
  return roots
})

const totalNodes = computed(() => flatNodes.value?.length ?? 0)

// Broadcast channel for expand-all / collapse-all. Nodes watch the signal
// ref and set their local expanded state to `target`. Using a counter means
// repeated clicks of the same button still trigger watchers.
const expandAllSignal = ref(0)
const expandAllTarget = ref(false)
provide('tree-expand-all-signal', expandAllSignal)
provide('tree-expand-all-target', expandAllTarget)

function expandAll() {
  expandAllTarget.value = true
  expandAllSignal.value++
  track('Tree expand all', { issueId: Number(issueId.value) })
}

function collapseAll() {
  expandAllTarget.value = false
  expandAllSignal.value++
  track('Tree collapse all', { issueId: Number(issueId.value) })
}
</script>

<template>
  <div class="mt-4 flex flex-col max-w-3xl mx-auto gap-4">
    <div
      v-if="rootChildren.length > 0"
      class="flex items-center justify-between gap-2"
    >
      <p class="text-xs text-toned font-mono">
        {{ totalNodes }} {{ totalNodes === 1 ? 'node' : 'nodes' }}
      </p>
      <div class="flex gap-2">
        <UButton
          size="sm"
          variant="ghost"
          icon="lucide:chevrons-down"
          @click="expandAll"
        >
          Expand all
        </UButton>
        <UButton
          size="sm"
          variant="ghost"
          icon="lucide:chevrons-up"
          @click="collapseAll"
        >
          Collapse all
        </UButton>
      </div>
    </div>

    <UiCard v-if="rootChildren.length > 0" padding="md">
      <IssueTreeNode
        v-for="node in rootChildren"
        :key="node.id"
        :node="node"
        :depth="1"
        :default-expanded-depth="DEFAULT_EXPANDED_DEPTH"
      />
    </UiCard>

    <p
      v-else-if="!pending"
      class="text-toned text-center py-8"
    >
      No children yet.
    </p>
  </div>
</template>
