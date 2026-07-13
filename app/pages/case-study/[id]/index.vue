<script setup lang="ts">
// Overview for a case study: every structured field rendered as a card. The
// owner/collaborators panel and the change history are deliberately kept off
// this view — CommunityFix leads with the record, not the people — and reached
// via the quiet meta links at the bottom (mirrors the issue/solution Overview).
const route = useRoute()
const id = computed(() => route.params.id as string)

// The parent [id].vue shell already loaded the study and provided it.
const study = inject<Ref<any>>('caseStudy')

const dateRange = computed(() => caseStudyDateRange(study?.value?.startDate, study?.value?.endDate))
const costDisplay = computed(() => caseStudyCost(study?.value?.cost, study?.value?.currency))

const mapVisible = ref(false)
onMounted(() => {
  mapVisible.value = true
})
</script>

<template>
  <!--
    This Overview template aggregates the case study's structured fields into a
    flat list of `v-if` cards. Its complexity was MOVED here from the old
    monolithic [id].vue (which the refactor split into this + a shell), so total
    template complexity dropped — but the diff-gate re-attributes each touched
    template as introduced. Suppress; splitting each card into its own component
    is a separate cosmetic refactor.
  -->
  <!-- fallow-ignore-next-line complexity -->
  <div v-if="study" class="mt-3 space-y-3">
    <div v-if="study.implementer || dateRange" class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div v-if="study.implementer" class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6">
        <div class="flex items-center gap-2 mb-2.5">
          <UIcon class="size-4 text-gray-400" name="lucide:users" />
          <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
            Implementer
          </p>
        </div>
        <p class="text-sm text-gray-700">
          {{ study.implementer }}
        </p>
      </div>
      <div v-if="dateRange" class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6">
        <div class="flex items-center gap-2 mb-2.5">
          <UIcon class="size-4 text-gray-400" name="lucide:calendar" />
          <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
            Timeline
          </p>
        </div>
        <p class="text-sm text-gray-700">
          {{ dateRange }}
        </p>
      </div>
    </div>
    <div v-if="study.location" class="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden">
      <div class="flex items-center gap-3 p-4 sm:p-6 border-b border-gray-200">
        <UIcon class="size-4 shrink-0 text-gray-400" name="lucide:map" />
        <div class="flex-1 min-w-0">
          <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
            Location
          </p>
          <div class="flex items-center gap-2 flex-wrap mt-1">
            <span class="text-sm font-medium text-gray-700">
              {{ study.locationName }}
            </span>
            <span class="text-xs text-gray-400 font-mono">
              {{ study.location.latitude.toFixed(4) }}, {{ study.location.longitude.toFixed(4) }}
            </span>
          </div>
        </div>
      </div>
      <div class="h-[300px]">
        <LocationMap
          v-if="mapVisible"
          :area="study.location.area"
          :latitude="study.location.latitude"
          :longitude="study.location.longitude"
          :scale="study.scale"
        />
      </div>
    </div>
    <div v-if="study.description" class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6">
      <div class="flex items-center gap-2 mb-2.5">
        <UIcon class="size-4 text-gray-400" name="lucide:file-text" />
        <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
          Description
        </p>
      </div>
      <UiMarkdown class="prose-sm text-gray-700" :value="study.description" />
    </div>
    <div
      v-if="study.metrics?.length"
      class="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden"
    >
      <div class="flex items-center gap-2 p-4 sm:p-6 border-b border-gray-200">
        <UIcon class="size-4 text-gray-400" name="lucide:line-chart" />
        <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
          Metrics
        </p>
        <span class="text-xs font-mono text-gray-400">
          {{ study.metrics.length }}
        </span>
      </div>
      <div class="divide-y divide-gray-200 bg-white text-sm">
        <div
          v-for="(m, i) in study.metrics"
          :key="i"
          class="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-baseline px-4 py-3 sm:px-6"
        >
          <span class="truncate text-gray-700">
            {{ m.label }}
          </span>
          <span class="font-mono text-xs whitespace-nowrap">
            <template v-if="m.baseline">
              <span class="text-gray-400">
                {{ m.baseline }}
              </span>
              <UIcon class="size-3 -mt-0.5 mx-1 text-gray-400" name="lucide:arrow-right" />
            </template>
            <span v-if="m.result" class="text-gray-900 font-semibold">
              {{ m.result }}
            </span>
            <span v-if="m.unit" class="text-gray-500 ml-1">
              {{ m.unit }}
            </span>
          </span>
        </div>
      </div>
    </div>
    <div
      v-if="costDisplay || study.fundingSource"
      class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6"
    >
      <div class="flex items-center gap-2 mb-2.5">
        <UIcon class="size-4 text-gray-400" name="lucide:wallet" />
        <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
          Funding
        </p>
      </div>
      <div class="flex items-center gap-x-3 gap-y-1 flex-wrap text-sm text-gray-700">
        <span v-if="costDisplay" class="font-mono">
          {{ costDisplay }}
        </span>
        <span v-if="costDisplay && study.fundingSource" class="text-gray-300">
          ·
        </span>
        <span v-if="study.fundingSource">
          {{ study.fundingSource }}
        </span>
      </div>
    </div>
    <div
      v-if="study.lessonsLearned?.length"
      class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6"
    >
      <div class="flex items-center gap-2 mb-2.5">
        <UIcon class="size-4 text-gray-400" name="lucide:lightbulb" />
        <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
          Lessons learned
        </p>
      </div>
      <ul class="list-disc list-outside pl-5 space-y-1.5 text-sm text-gray-700">
        <li v-for="(l, i) in study.lessonsLearned" :key="i">
          {{ l }}
        </li>
      </ul>
    </div>
    <CaseStudyLinkCard icon="lucide:book-open" label="Sources" :items="study.sources ?? []" />
    <CaseStudyLinkCard icon="lucide:paperclip" label="Links" :items="study.links ?? []" />
    <div class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6 flex items-center justify-between gap-3 flex-wrap">
      <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
        Documented
        {{
          new Date(study.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        }}
      </p>
      <UserButton :author-id="study.authorId" :name="study.author" />
    </div>
    <!-- Quiet meta links — who maintains the study and how it changed over time.
    Deliberately at the very bottom: useful, but not what the page is about. -->
    <NodeMetaLinks kind="case_study" :base="`/case-study/${id}`" />
  </div>
</template>
