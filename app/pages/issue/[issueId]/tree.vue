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
// Case-study rows share the `issues.id` space only conceptually — a row's
// raw id can collide with an issue id since they come from separate tables.
// Key the lookup map by `${type}:${id}`, and resolve parents through an
// issue-only index since a case-study's parentId points at a solution row.
const rootChildren = computed<NestedNode[]>(() => {
  const rows = flatNodes.value
  if (!rows || rows.length === 0) return []

  const byKey = new Map<string, NestedNode>()
  const issueById = new Map<number, NestedNode>()
  for (const row of rows) {
    const node: NestedNode = { ...row, children: [] }
    byKey.set(`${row.type}:${row.id}`, node)
    if (row.type !== 'case-study') issueById.set(row.id, node)
  }

  const roots: NestedNode[] = []
  const rootParentId = Number(issueId.value)
  for (const node of byKey.values()) {
    // Case studies never sit at the root of the children panel — they
    // belong under a solution row.
    if (node.type !== 'case-study' && node.parentId === rootParentId) {
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
    <div v-if="rootChildren.length > 0" class="flex items-center justify-between gap-2">
      <p class="text-xs text-toned font-mono">
        {{ totalNodes }} {{ totalNodes === 1 ? 'node' : 'nodes' }}
      </p>
      <div class="flex gap-2">
        <UButton icon="lucide:chevrons-down" size="sm" variant="ghost" @click="expandAll">
          Expand all
        </UButton>
        <UButton icon="lucide:chevrons-up" size="sm" variant="ghost" @click="collapseAll">
          Collapse all
        </UButton>
      </div>
    </div>
    <UiCard v-if="rootChildren.length > 0" padding="md">
      <IssueTreeNode
        v-for="node in rootChildren"
        :key="node.id"
        :default-expanded-depth="DEFAULT_EXPANDED_DEPTH"
        :depth="1"
        :node="node"
      />
    </UiCard>
    <p v-else-if="!pending" class="text-toned text-center py-8">
      No children yet.
    </p>
  </div>
</template>
