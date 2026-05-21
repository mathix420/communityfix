<script setup lang="ts">
const route = useRoute()
const issueId = computed(() => route.params.issueId as string)
const { track } = useUmami()

// Parent route provides the loaded issue row so we can tell solution from issue
// without an extra fetch. Same shape as /api/issue/:id response.
const parentIssue = inject<Ref<{ id: number, type: 'issue' | 'solution', title: string } | null>>('issue', ref(null))
const isSolution = computed(() => parentIssue.value?.type === 'solution')

const search = ref('')

const { data: studies } = await useFetch(() => `/api/issue/${issueId.value}/case-studies`)

const { loggedIn } = useUserSession()
const { data: banStatus } = await useFetch('/api/user/ban-status', {
  immediate: loggedIn.value,
  watch: false,
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return studies.value ?? []
  return (studies.value ?? []).filter((s) => {
    return (
      s.locationName?.toLowerCase().includes(q)
      || s.implementer?.toLowerCase().includes(q)
      || s.description?.toLowerCase().includes(q)
      || s.outcome?.toLowerCase().includes(q)
    )
  })
})
</script>

<template>
  <div class="mt-4 flex flex-col max-w-3xl mx-auto gap-4">
    <div
      v-if="(studies?.length ?? 0) > 0 || search.trim()"
      class="flex items-stretch gap-3"
    >
      <div class="flex items-stretch flex-1 rounded-md overflow-hidden border border-gray-200">
        <UInput
          v-model="search"
          placeholder="Search by place, implementer, outcome..."
          icon="i-lucide-search"
          size="md"
          variant="none"
          class="flex-1"
        />
      </div>
      <UiActionButton
        v-if="isSolution && !banStatus?.banned"
        :to="`/new-case-study?solution=${issueId}`"
        @click="track('Open case study form')"
      >
        Document a case study
      </UiActionButton>
    </div>

    <BanNotice
      v-if="banStatus?.banned"
      :ban-status="banStatus"
      @appealed="refreshNuxtData()"
    />

    <div
      v-if="!isSolution"
      class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 flex items-start gap-2"
    >
      <UIcon name="lucide:info" class="size-4 mt-0.5 text-gray-400 shrink-0" />
      <span>
        Case studies attach to a <strong>solution</strong>, not directly to an issue. The list below
        aggregates real-world implementations across this issue's solutions. To document one,
        open a solution and add a case study from there.
      </span>
    </div>

    <CardCaseStudy
      v-for="study in filtered"
      :key="study.id"
      :study="study"
    />

    <template v-if="filtered.length === 0">
      <p v-if="search.trim()" class="text-toned text-center py-8">
        No case studies match your search.
      </p>
      <UiEmptyState
        v-else-if="isSolution"
        icon="lucide:map-pin"
        title="Share where this has worked"
        description="Real implementations help others replicate the wins and avoid the pitfalls."
        cta-label="Document a case study"
        :cta-to="`/new-case-study?solution=${issueId}`"
        cta-event="Empty state cta case studies"
      />
      <UiEmptyState
        v-else
        icon="lucide:map-pin"
        title="Case studies live on solutions"
        description="Open a solution and add one from its Studies tab."
        cta-label="View solutions"
        :cta-to="`/issue/${issueId}/solutions`"
      />
    </template>
  </div>
</template>
