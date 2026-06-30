<script setup lang="ts">
// Who maintains and who has contributed to this node. Kept off the top of the
// page on purpose — CommunityFix leads with the issue/solution, not with people
// — and reached via a quiet link at the bottom of the Overview instead. Owners /
// admins get the promote / step-down controls here.
const route = useRoute()
const issueId = computed(() => route.params.issueId as string)

const issue = inject<Ref<{ id: number } | null>>('issue')
</script>

<template>
  <div class="mt-3">
    <NodeMembers v-if="issue" always-show :kind="'issue'" :node-id="issue.id" />
  </div>
</template>
