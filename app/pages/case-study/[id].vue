<script setup lang="ts">
const route = useRoute()
const id = computed(() => route.params.id as string)

const { data: study } = await useFetch(() => `/api/case-study/${id.value}`)

const { data: parent } = await useFetch(
  () => `/api/issue/${study.value?.solutionId}`,
  { immediate: !!study.value?.solutionId, watch: false },
)

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
const scaleLabel: Record<string, string> = {
  neighborhood: 'Neighborhood',
  city: 'City',
  region: 'Region',
  national: 'National',
  global: 'Global',
}

function formatDay(s?: string | null): string | null {
  if (!s) return null
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const dateRange = computed(() => {
  const start = formatDay(study.value?.startDate)
  const end = formatDay(study.value?.endDate)
  if (!start && !end) return null
  if (start && end) return start === end ? start : `${start} – ${end}`
  if (start) return `Since ${start}`
  return `Until ${end}`
})

const costDisplay = computed(() => {
  const cost = study.value?.cost
  if (cost == null) return null
  const num = Number(cost)
  if (!Number.isFinite(num)) return String(cost)
  const currency = study.value?.currency?.trim()
  if (currency && /^[A-Za-z]{3}$/.test(currency)) {
    try {
      return new Intl.NumberFormat('en', {
        style: 'currency',
        currency: currency.toUpperCase(),
        maximumFractionDigits: 0,
      }).format(num)
    }
    catch { /* fall through */ }
  }
  const formatted = new Intl.NumberFormat('en').format(num)
  return currency ? `${formatted} ${currency}` : formatted
})

const mapVisible = ref(false)
onMounted(() => {
  mapVisible.value = true
})

if (study.value) {
  const title = `Case study: ${study.value.locationName}`
  const description = study.value.description?.slice(0, 200)
    || `Real-world implementation in ${study.value.locationName}.`
  useSeoMeta({
    title: `${title} - CommunityFix`,
    description,
    ogTitle: title,
    ogDescription: description,
  })
}
</script>

<template>
  <AppContainer v-if="study">
    <div class="max-w-3xl mx-auto">
      <IssueParentCallout
        v-if="parent"
        :parent="{ id: parent.id, title: parent.title }"
        label="Case study of"
        class="mb-6"
      />

      <header class="flex sm:items-center justify-between mb-4 sm:flex-row flex-col-reverse gap-2">
        <div class="flex items-center gap-3 min-w-0">
          <UIcon name="lucide:map-pin" class="size-7 sm:size-8 shrink-0 text-gray-400" />
          <h1 :class="underlinedTitle" class="truncate">
            {{ study.locationName }}
          </h1>
        </div>
        <p class="text-5xl text-black/10 font-mono sm:mt-0 -mt-5 shrink-0">
          #{{ study.id.toString().padStart(5, '0') }}
        </p>
      </header>

      <div class="flex items-center gap-2 flex-wrap mb-8">
        <UiBadge :variant="outcomeVariant[study.outcome] ?? 'default'">
          {{ outcomeLabel[study.outcome] ?? study.outcome }}
        </UiBadge>
        <UiBadge
          v-if="study.verified"
          variant="success"
          class="inline-flex items-center gap-1"
        >
          <UIcon name="lucide:badge-check" class="size-3.5" />
          Verified
        </UiBadge>
        <UiBadge v-if="study.scale">
          {{ scaleLabel[study.scale] ?? study.scale }}
        </UiBadge>
      </div>

      <div class="space-y-3">
        <div
          v-if="study.implementer || dateRange"
          class="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <div
            v-if="study.implementer"
            class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6"
          >
            <div class="flex items-center gap-2 mb-2.5">
              <UIcon name="lucide:users" class="size-4 text-gray-400" />
              <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
                Implementer
              </p>
            </div>
            <p class="text-sm text-gray-700">
              {{ study.implementer }}
            </p>
          </div>

          <div
            v-if="dateRange"
            class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6"
          >
            <div class="flex items-center gap-2 mb-2.5">
              <UIcon name="lucide:calendar" class="size-4 text-gray-400" />
              <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
                Timeline
              </p>
            </div>
            <p class="text-sm text-gray-700">
              {{ dateRange }}
            </p>
          </div>
        </div>

        <div
          v-if="study.location"
          class="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden"
        >
          <div class="flex items-center gap-3 p-4 sm:p-6 border-b border-gray-200">
            <UIcon name="lucide:map" class="size-4 shrink-0 text-gray-400" />
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
              :latitude="study.location.latitude"
              :longitude="study.location.longitude"
              :scale="study.scale"
              :area="study.location.area"
            />
          </div>
        </div>

        <div
          v-if="study.description"
          class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6"
        >
          <div class="flex items-center gap-2 mb-2.5">
            <UIcon name="lucide:file-text" class="size-4 text-gray-400" />
            <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
              Description
            </p>
          </div>
          <UiMarkdown
            :value="study.description"
            class="prose-sm text-gray-700"
          />
        </div>

        <div
          v-if="study.metrics?.length"
          class="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden"
        >
          <div class="flex items-center gap-2 p-4 sm:p-6 border-b border-gray-200">
            <UIcon name="lucide:line-chart" class="size-4 text-gray-400" />
            <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
              Metrics
            </p>
            <span class="text-xs font-mono text-gray-400">{{ study.metrics.length }}</span>
          </div>
          <div class="divide-y divide-gray-200 bg-white text-sm">
            <div
              v-for="(m, i) in study.metrics"
              :key="i"
              class="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-baseline px-4 py-3 sm:px-6"
            >
              <span class="truncate text-gray-700">{{ m.label }}</span>
              <span class="font-mono text-xs whitespace-nowrap">
                <template v-if="m.baseline">
                  <span class="text-gray-400">{{ m.baseline }}</span>
                  <UIcon name="lucide:arrow-right" class="size-3 -mt-0.5 mx-1 text-gray-400" />
                </template>
                <span v-if="m.result" class="text-gray-900 font-semibold">{{ m.result }}</span>
                <span v-if="m.unit" class="text-gray-500 ml-1">{{ m.unit }}</span>
              </span>
            </div>
          </div>
        </div>

        <div
          v-if="costDisplay || study.fundingSource"
          class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6"
        >
          <div class="flex items-center gap-2 mb-2.5">
            <UIcon name="lucide:wallet" class="size-4 text-gray-400" />
            <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
              Funding
            </p>
          </div>
          <div class="flex items-center gap-x-3 gap-y-1 flex-wrap text-sm text-gray-700">
            <span v-if="costDisplay" class="font-mono">{{ costDisplay }}</span>
            <span v-if="costDisplay && study.fundingSource" class="text-gray-300">·</span>
            <span v-if="study.fundingSource">{{ study.fundingSource }}</span>
          </div>
        </div>

        <div
          v-if="study.lessonsLearned?.length"
          class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6"
        >
          <div class="flex items-center gap-2 mb-2.5">
            <UIcon name="lucide:lightbulb" class="size-4 text-gray-400" />
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

        <div
          v-if="study.sources?.length"
          class="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden"
        >
          <div class="flex items-center gap-2 p-4 sm:p-6 border-b border-gray-200">
            <UIcon name="lucide:book-open" class="size-4 text-gray-400" />
            <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
              Sources
            </p>
            <span class="text-xs font-mono text-gray-400">{{ study.sources.length }}</span>
          </div>
          <ul class="divide-y divide-gray-200 bg-white">
            <li v-for="(s, i) in study.sources" :key="i">
              <a
                :href="s.url"
                target="_blank"
                rel="nofollow noopener noreferrer"
                class="flex items-center gap-3 px-4 py-2.5 sm:px-6 hover:bg-gray-50 transition-colors min-w-0"
              >
                <UIcon name="lucide:external-link" class="size-3.5 text-gray-400 shrink-0" />
                <span class="truncate text-sm text-primary-700">
                  {{ s.title || s.url }}
                </span>
              </a>
            </li>
          </ul>
        </div>

        <div
          v-if="study.links?.length"
          class="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden"
        >
          <div class="flex items-center gap-2 p-4 sm:p-6 border-b border-gray-200">
            <UIcon name="lucide:paperclip" class="size-4 text-gray-400" />
            <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
              Links
            </p>
            <span class="text-xs font-mono text-gray-400">{{ study.links.length }}</span>
          </div>
          <ul class="divide-y divide-gray-200 bg-white">
            <li v-for="(l, i) in study.links" :key="i">
              <a
                :href="l.url"
                target="_blank"
                rel="nofollow noopener noreferrer"
                class="flex items-center gap-3 px-4 py-2.5 sm:px-6 hover:bg-gray-50 transition-colors min-w-0"
              >
                <UIcon name="lucide:external-link" class="size-3.5 text-gray-400 shrink-0" />
                <span class="truncate text-sm text-primary-700">
                  {{ l.title || l.url }}
                </span>
              </a>
            </li>
          </ul>
        </div>

        <div
          class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6 flex items-center justify-between gap-3 flex-wrap"
        >
          <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
            Documented {{ new Date(study.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }}
          </p>
          <UserButton :author-id="study.authorId" :name="study.author" />
        </div>
      </div>
    </div>
  </AppContainer>
  <AppContainer v-else>
    <div class="flex items-center justify-center h-screen">
      <p class="text-toned text-lg">
        Case study not found.
      </p>
    </div>
  </AppContainer>
</template>
