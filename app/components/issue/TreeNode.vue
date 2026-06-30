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
const isCaseStudy = computed(() => props.node.type === 'case-study')

const linkTo = computed(() =>
  isCaseStudy.value ? `/case-study/${props.node.id}` : `/issue/${props.node.id}`,
)

const nodeIcon = computed(() => {
  if (isCaseStudy.value) return 'lucide:map-pin'
  if (isSolution.value) return 'lucide:lightbulb'
  return 'lucide:circle-alert'
})

const nodeIconClass = computed(() => {
  if (isCaseStudy.value) return 'text-emerald-600'
  if (isSolution.value) return 'text-primary-600'
  return 'text-gray-400'
})

const outcomeVariant: Record<string, 'success' | 'default' | 'error' | 'warning'> = {
  success: 'success',
  partial: 'default',
  failed: 'error',
  inconclusive: 'default',
  ongoing: 'warning',
}
const outcomeLabel: Record<string, string> = {
  success: 'Success',
  partial: 'Partial',
  failed: 'Failed',
  inconclusive: 'Inconclusive',
  ongoing: 'Ongoing',
}
</script>

<template>
  <div class="tree-node">
    <div class="flex items-center gap-2 py-1.5 min-w-0">
      <button
        v-if="hasChildren"
        class="shrink-0 size-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
        type="button"
        :aria-label="expanded ? 'Collapse' : 'Expand'"
        @click="expanded = !expanded"
      >
        <UIcon class="size-4" :name="expanded ? 'lucide:chevron-down' : 'lucide:chevron-right'" />
      </button>
      <div v-else class="shrink-0 size-5" />
      <UIcon class="shrink-0 size-4" :class="nodeIconClass" :name="nodeIcon" />
      <NuxtLink class="interactive-underline truncate font-title" :to="linkTo">
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
      <UiBadge
        v-if="isCaseStudy && node.outcome"
        :variant="outcomeVariant[node.outcome] ?? 'default'"
      >
        {{ outcomeLabel[node.outcome] ?? node.outcome }}
      </UiBadge>
      <div
        v-if="!isCaseStudy"
        class="ml-auto shrink-0 flex items-center gap-1.5 text-xs font-mono text-gray-600"
      >
        <span class="px-1.5 py-0.5 bg-gray-100 rounded" :title="`${node.voteScore} votes`">
          <UIcon class="size-3 -mt-0.5" name="lucide:arrow-up" />
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
    <div v-if="expanded && hasChildren" class="ml-2.5 border-l border-gray-200 pl-3">
      <IssueTreeNode
        v-for="child in node.children"
        :key="child.id"
        :default-expanded-depth="defaultExpandedDepth"
        :depth="depth + 1"
        :node="child"
      />
    </div>
  </div>
</template>
