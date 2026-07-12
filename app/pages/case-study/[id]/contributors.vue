<script setup lang="ts">
// Who maintains and who has contributed to this case study. Kept off the top of
// the page on purpose — CommunityFix leads with the record, not with people —
// and reached via a quiet link at the bottom of the Overview instead. Owners /
// admins get the promote / step-down controls here.
const route = useRoute()
const id = computed(() => route.params.id as string)

const study = inject<Ref<{ id: number } | null>>('caseStudy')
</script>

<template>
  <div class="mt-3 space-y-4">
    <NodeBackLink :to="`/case-study/${id}`" label="Back to case study" />
    <NodeMembers v-if="study" always-show :kind="'case_study'" :node-id="study.id" />
  </div>
</template>
