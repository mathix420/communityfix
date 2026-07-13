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
  location?: { latitude: number; longitude: number } | null
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
  owners?: { id: string | null; name: string; changes: number }[]
  collaborators?: { id: string | null; name: string; changes: number }[]
}

const props = defineProps<{ study: CaseStudy }>()

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
    } catch {
      /* fall through */
    }
  }
  const compact = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num)
  return currency ? `${compact} ${currency}` : compact
})

const sourceCount = computed(() => props.study.sources?.length ?? 0)
</script>

<template>
  <UiCard padding="md">
    <div class="flex flex-col gap-3 min-w-0">
      <!-- Title row: location is the anchor, outcome is the only colored signal -->
      <div class="flex items-start justify-between gap-3 min-w-0">
        <NuxtLink class="flex items-center gap-2 min-w-0 group" :to="`/case-study/${study.id}`">
          <h3 class="font-title text-lg text-gray-900 leading-snug truncate group-hover:underline decoration-primary">
            {{ study.locationName }}
          </h3>
          <UIcon
            v-if="study.verified"
            class="size-4 shrink-0 text-green-600"
            name="lucide:badge-check"
            title="Verified"
          />
        </NuxtLink>
        <UiBadge class="shrink-0" :variant="outcomeBadgeVariant(study.outcome)">
          {{ outcomeBadgeLabel(study.outcome) }}
        </UiBadge>
      </div>
      <!-- Meta: one quiet line, text only -->
      <p
        v-if="study.implementer || dateRange || study.scale"
        class="font-mono text-xs text-gray-500 truncate -mt-1.5"
      >
        {{
          [study.implementer, dateRange, study.scale && scaleBadgeLabel(study.scale)]
            .filter(Boolean)
            .join(' · ')
        }}
      </p>
      <UiMarkdown
        v-if="descriptionPreview"
        class="prose-sm text-gray-700"
        :value="descriptionPreview"
      />
      <!-- Metrics: soft surface separates them from prose, baseline → result -->
      <div v-if="topMetrics.length" class="rounded-lg bg-gray-100 px-3 py-2 flex flex-col gap-1.5">
        <div
          v-for="(m, i) in topMetrics"
          :key="i"
          class="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-baseline text-sm"
        >
          <span class="truncate text-gray-600">
            {{ m.label }}
          </span>
          <span class="font-mono text-xs whitespace-nowrap">
            <template v-if="m.baseline">
              <span class="text-gray-400">
                {{ m.baseline }}
              </span>
              <span class="text-gray-400 mx-1">
                →
              </span>
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
      <!-- Footer: cost · funding · sources, avatars right -->
      <div
        v-if="costDisplay || study.fundingSource || sourceCount || study.owners || study.collaborators"
        class="flex items-center justify-between gap-3 min-w-0"
      >
        <p class="font-mono text-xs text-gray-500 truncate">
          {{
            [
              costDisplay,
              study.fundingSource,
              sourceCount ? `${sourceCount} source${sourceCount === 1 ? '' : 's'}` : null,
            ]
              .filter(Boolean)
              .join(' · ')
          }}
        </p>
        <UserAvatarStack
          :collaborators="study.collaborators"
          :owners="study.owners ?? [{ id: study.authorId ?? null, name: study.author, changes: 0 }]"
        />
      </div>
    </div>
  </UiCard>
</template>
