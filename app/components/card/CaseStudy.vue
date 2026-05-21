<script setup lang="ts">
interface Metric {
  label: string
  baseline?: string
  result?: string
  unit?: string
}

interface Source {
  url: string
  title?: string
}

interface CaseStudy {
  id: number
  solutionId: number
  authorId?: string | null
  author: string
  outcome: 'success' | 'partial' | 'failed' | 'inconclusive' | 'ongoing'
  scale?: string | null
  locationName: string
  location?: { latitude: number, longitude: number } | null
  verified: boolean
  description?: string | null
  implementer?: string | null
  startDate?: string | null
  endDate?: string | null
  metrics?: Metric[] | null
  cost?: string | number | null
  currency?: string | null
  fundingSource?: string | null
  sources?: Source[] | null
  lessonsLearned?: string[] | null
}

const props = defineProps<{ study: CaseStudy }>()

const outcomeVariant: Record<CaseStudy['outcome'], 'success' | 'default' | 'error' | 'warning'> = {
  success: 'success',
  partial: 'default',
  failed: 'error',
  inconclusive: 'default',
  ongoing: 'warning',
}
const outcomeLabel: Record<CaseStudy['outcome'], string> = {
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

function yearOf(s?: string | null): string | null {
  if (!s) return null
  const m = /^(\d{4})/.exec(s)
  return m ? m[1]! : null
}

const dateRange = computed(() => {
  const start = yearOf(props.study.startDate)
  const end = yearOf(props.study.endDate)
  if (!start && !end) return null
  if (start && end) return start === end ? start : `${start}–${end}`
  if (start) return `since ${start}`
  return `until ${end}`
})

// Card mode: only the first paragraph so the card stays compact.
const descriptionPreview = computed(() => {
  if (!props.study.description) return null
  const firstBlock = props.study.description.split(/\n{2,}/)[0]!
  return firstBlock.length > 220 ? firstBlock.slice(0, 219).trimEnd() + '…' : firstBlock
})

const topMetrics = computed<Metric[]>(() => (props.study.metrics ?? []).slice(0, 2))

// Compact money formatting. Falls back gracefully when currency isn't a valid
// ISO code (the form lets users type any 8-char string).
const costDisplay = computed(() => {
  if (props.study.cost == null) return null
  const num = Number(props.study.cost)
  if (!Number.isFinite(num)) return String(props.study.cost)
  const currency = props.study.currency?.trim()
  if (currency && /^[A-Za-z]{3}$/.test(currency)) {
    try {
      return new Intl.NumberFormat('en', {
        style: 'currency',
        currency: currency.toUpperCase(),
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(num)
    }
    catch { /* fall through */ }
  }
  const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(num)
  return currency ? `${compact} ${currency}` : compact
})

const sourceCount = computed(() => props.study.sources?.length ?? 0)
</script>

<template>
  <UiCard padding="md">
    <div class="flex flex-col gap-3 min-w-0">
      <!-- Title row: location is the anchor, outcome+verified are right-aligned signals -->
      <div class="flex items-start justify-between gap-3 min-w-0">
        <NuxtLink
          :to="`/case-study/${study.id}`"
          class="flex items-center gap-2 min-w-0 group"
        >
          <UIcon name="lucide:map-pin" class="size-4 shrink-0 text-gray-400" />
          <h3 class="font-title text-lg text-gray-900 leading-snug truncate group-hover:underline decoration-primary">
            {{ study.locationName }}
          </h3>
          <UIcon
            v-if="study.verified"
            name="lucide:badge-check"
            class="size-4 shrink-0 text-green-600"
            title="Verified"
          />
        </NuxtLink>
        <UiBadge :variant="outcomeVariant[study.outcome]" class="shrink-0">
          {{ outcomeLabel[study.outcome] }}
        </UiBadge>
      </div>

      <!-- Meta line: implementer · dates · scale, single greyscale row -->
      <div
        v-if="study.implementer || dateRange || study.scale"
        class="text-xs text-gray-500 font-mono flex items-center gap-1.5 flex-wrap"
      >
        <span v-if="study.implementer" class="inline-flex items-center gap-1.5">
          <UIcon name="lucide:users" class="size-3.5 text-gray-400" />
          <span class="text-gray-700">{{ study.implementer }}</span>
        </span>
        <span v-if="study.implementer && dateRange" class="text-gray-300">·</span>
        <span v-if="dateRange" class="inline-flex items-center gap-1.5">
          <UIcon name="lucide:calendar" class="size-3.5 text-gray-400" />
          {{ dateRange }}
        </span>
        <span v-if="(study.implementer || dateRange) && study.scale" class="text-gray-300">·</span>
        <span v-if="study.scale" class="inline-flex items-center gap-1.5">
          <UIcon name="lucide:globe" class="size-3.5 text-gray-400" />
          {{ scaleLabel[study.scale] ?? study.scale }}
        </span>
      </div>

      <UiMarkdown
        v-if="descriptionPreview"
        :value="descriptionPreview"
        class="prose-sm text-gray-700 mt-0.5"
      />

      <!-- Metrics: tightened spacing, baseline → result remains the hero pattern -->
      <div
        v-if="topMetrics.length"
        class="rounded-md bg-gray-50 border border-gray-200 divide-y divide-gray-200 text-sm"
      >
        <div
          v-for="(m, i) in topMetrics"
          :key="i"
          class="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-baseline px-3 py-2"
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

      <!-- Footer: meta row (left) + author (right) on one line, no separator -->
      <div class="flex items-center justify-between gap-3 flex-wrap pt-1 min-h-[1.75rem]">
        <div class="flex items-center gap-1.5 text-xs font-mono text-gray-500 flex-wrap min-w-0">
          <span v-if="costDisplay" class="inline-flex items-center gap-1.5">
            <UIcon name="lucide:wallet" class="size-3.5 text-gray-400" />
            <span class="text-gray-700">{{ costDisplay }}</span>
          </span>
          <span v-if="costDisplay && study.fundingSource" class="text-gray-300">·</span>
          <span v-if="study.fundingSource" class="truncate max-w-[24ch] sm:max-w-[36ch]">
            {{ study.fundingSource }}
          </span>
          <span v-if="(costDisplay || study.fundingSource) && sourceCount" class="text-gray-300">·</span>
          <span v-if="sourceCount" class="inline-flex items-center gap-1.5">
            <UIcon name="lucide:book-open" class="size-3.5 text-gray-400" />
            {{ sourceCount }} source{{ sourceCount === 1 ? '' : 's' }}
          </span>
        </div>

        <UserButton :author-id="study.authorId" :name="study.author" />
      </div>
    </div>
  </UiCard>
</template>
