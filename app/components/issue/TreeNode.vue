<script setup lang="ts">
import type { TreeNode } from '../../../server/api/issue/[id]/tree.get'

interface NestedNode extends TreeNode {
  children: NestedNode[]
}

const props = defineProps<{
  node: NestedNode
  depth: number
  defaultExpandedDepth: number
}>()

// Expand/collapse-all signal broadcast from the tab page. When it flips we
// set every node's local state to match, so the whole tree opens or closes
// without prop-drilling refs through the recursion.
const expandAllSignal = inject<Ref<number>>('tree-expand-all-signal')
const expandAllTarget = inject<Ref<boolean>>('tree-expand-all-target')

const expanded = ref(props.depth < props.defaultExpandedDepth)

if (expandAllSignal && expandAllTarget) {
  watch(expandAllSignal, () => {
    expanded.value = expandAllTarget.value
  })
}

const hasChildren = computed(() => props.node.children.length > 0)
const isSolution = computed(() => props.node.type === 'solution')
</script>

<template>
  <div class="tree-node">
    <div class="flex items-center gap-2 py-1.5 min-w-0">
      <button
        v-if="hasChildren"
        type="button"
        class="shrink-0 size-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
        :aria-label="expanded ? 'Collapse' : 'Expand'"
        @click="expanded = !expanded"
      >
        <UIcon
          :name="expanded ? 'lucide:chevron-down' : 'lucide:chevron-right'"
          class="size-4"
        />
      </button>
      <div v-else class="shrink-0 size-5" />

      <UIcon
        :name="isSolution ? 'lucide:lightbulb' : 'lucide:circle-alert'"
        class="shrink-0 size-4"
        :class="isSolution ? 'text-primary-600' : 'text-gray-400'"
      />

      <NuxtLink
        :to="`/issue/${node.id}`"
        class="interactive-underline truncate font-title"
      >
        <span class="text-gray-400 select-none text-xs font-mono mr-1.5">
          {{ formatNumber(node.id) }}
        </span>
        {{ node.title }}
      </NuxtLink>

      <UiBadge v-if="node.solutionStatus === 'plan'" variant="default">
        Plan
      </UiBadge>
      <UiBadge v-else-if="node.solutionStatus === 'in-progress'" variant="warning">
        In progress
      </UiBadge>
      <UiBadge v-else-if="node.solutionStatus === 'done'" variant="success">
        Done
      </UiBadge>

      <div class="ml-auto shrink-0 flex items-center gap-1.5 text-xs font-mono text-gray-600">
        <span
          class="px-1.5 py-0.5 bg-gray-100 rounded"
          :title="`${node.voteScore} votes`"
        >
          <UIcon name="lucide:arrow-up" class="size-3 -mt-0.5" />
          {{ node.voteScore }}
        </span>
        <span
          v-if="node.subIssueCount > 0"
          class="px-1.5 py-0.5 bg-gray-100 rounded hidden sm:inline"
          :title="`${node.subIssueCount} sub-issues`"
        >
          {{ node.subIssueCount }} i
        </span>
        <span
          v-if="node.solutionCount > 0"
          class="px-1.5 py-0.5 bg-gray-100 rounded hidden sm:inline"
          :title="`${node.solutionCount} solutions`"
        >
          {{ node.solutionCount }} s
        </span>
      </div>
    </div>

    <div
      v-if="expanded && hasChildren"
      class="ml-2.5 border-l border-gray-200 pl-3"
    >
      <IssueTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :default-expanded-depth="defaultExpandedDepth"
      />
    </div>
  </div>
</template>
