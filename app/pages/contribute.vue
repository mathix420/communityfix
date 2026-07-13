<script setup lang="ts">
const { track } = useUmami()
const route = useRoute()
const router = useRouter()

// Display metadata for each help-wanted label. Kept in the page since this is the
// only surface that renders them.
const LABEL_META: Record<string, { title: string; hint: string; icon: string }> = {
  'needs-evidence': {
    title: 'Needs evidence',
    hint: 'Outcome is claimed but the case study has no metrics.',
    icon: 'i-lucide-flask-conical',
  },
  'needs-baseline': {
    title: 'Needs baseline',
    hint: 'Metrics have no before value, so the change can’t be read.',
    icon: 'i-lucide-ruler',
  },
  'needs-sources': {
    title: 'Needs sources',
    hint: 'Factual or numeric claims are missing citations.',
    icon: 'i-lucide-link',
  },
  'needs-cost': {
    title: 'Needs cost',
    hint: 'No cost or funding source recorded.',
    icon: 'i-lucide-banknote',
  },
  'needs-location': {
    title: 'Needs location',
    hint: 'A place-bound node with no map coordinates.',
    icon: 'i-lucide-map-pin',
  },
}

const kindOptions = [
  { label: 'Everything', value: 'any' },
  { label: 'Issues', value: 'issue' },
  { label: 'Solutions', value: 'solution' },
  { label: 'Case studies', value: 'case_study' },
]

// Always-available ways in, so the page never dead-ends even when no node
// carries a help label. Mirrors the explore-card style on the home page.
const alwaysWays = [
  {
    label: 'Report an issue',
    description: 'Document a problem your community faces that the catalog is missing',
    icon: 'lucide:circle-alert',
    to: '/new',
    event: 'Contribute new issue',
  },
  {
    label: 'Propose a solution',
    description: 'Open an issue and add an approach that could address it',
    icon: 'lucide:lightbulb',
    to: '/issues',
    event: 'Contribute propose solution',
  },
  {
    label: 'Document a case study',
    description: 'Seen a solution tried somewhere? Record what happened, wins or failures',
    icon: 'lucide:map-pin',
    to: '/solutions',
    event: 'Contribute document case study',
  },
  {
    label: 'Register your skills',
    description: 'Declare what you can do, so we can point you at issues where it matters',
    icon: 'lucide:award',
    to: '/settings',
    event: 'Contribute register skills',
  },
]

const activeLabel = computed(() => (route.query.label as string) || '')
const kind = computed(() => (route.query.kind as string) || 'any')

const queryParams = computed(() => {
  const params: Record<string, string> = {}
  if (activeLabel.value) params.label = activeLabel.value
  if (kind.value && kind.value !== 'any') params.kind = kind.value
  return params
})

const { data } = await useFetch('/api/contribute', {
  query: queryParams,
  watch: [queryParams],
})

const counts = computed(() => data.value?.counts ?? {})
const totalNeeding = computed(() =>
  Object.values(counts.value).reduce((a, b) => a + (b as number), 0),
)
const issues = computed(() => data.value?.issues ?? [])
const caseStudies = computed(() => data.value?.caseStudies ?? [])
const resultCount = computed(() => issues.value.length + caseStudies.value.length)

function selectLabel(label: string) {
  const query = { ...route.query }
  if (label) query.label = label
  else delete query.label
  router.push({ query })
  track('Contribute filter label', { label: label || 'all' })
}

function selectKind(value: string) {
  const query = { ...route.query }
  if (value && value !== 'any') query.kind = value
  else delete query.kind
  router.push({ query })
  track('Contribute filter kind', { kind: value })
}

useSeoMeta({
  title: 'Contribute',
  description:
    'Help improve the catalog: add missing evidence, baselines, sources, costs, or locations, or document new issues, solutions, and case studies.',
  ogTitle: 'Contribute to CommunityFix',
  ogDescription:
    'Find issues, solutions, and case studies that need evidence, sources, or context.',
  ogType: 'website',
  twitterCard: 'summary',
})

defineOgImage('Editorial', { title: 'Contribute', category: 'Contribute' })
</script>

<template>
  <AppContainer class="container mx-auto p-4">
    <UiPageHeader
      description="The catalog gets stronger with every contribution. Close a flagged gap below, or add something the catalog is missing."
      title="Contribute"
    />
    <!-- Flagged gaps: label facets + kind filter -->
    <div class="flex flex-col gap-3 mb-8">
      <div class="flex flex-wrap gap-2">
        <button
          class="rounded-full px-3 py-1 text-sm font-mono border transition-colors"
          type="button"
          :class="activeLabel === ''
            ? 'bg-primary-50 text-primary-600 border-primary-200'
            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'"
          @click="selectLabel('')"
        >
          All labels
          <span v-if="totalNeeding" class="ml-1 text-xs text-gray-400 tabular-nums">
            {{ totalNeeding }}
          </span>
        </button>
        <button
          v-for="(meta, label) in LABEL_META"
          :key="label"
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-mono border transition-colors"
          type="button"
          :class="activeLabel === label
            ? 'bg-primary-50 text-primary-600 border-primary-200'
            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'"
          :title="meta.hint"
          @click="selectLabel(label)"
        >
          <UIcon class="size-3.5" :name="meta.icon" />
          {{ meta.title }}
          <span v-if="counts[label]" class="text-xs text-gray-400 tabular-nums">
            {{ counts[label] }}
          </span>
        </button>
      </div>
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <p v-if="activeLabel && LABEL_META[activeLabel]" class="text-sm text-gray-600">
          {{ LABEL_META[activeLabel].hint }}
        </p>
        <div class="flex gap-1 flex-wrap sm:ml-auto">
          <UButton
            v-for="opt in kindOptions"
            :key="opt.value"
            size="xs"
            variant="ghost"
            :color="kind === opt.value ? 'primary' : 'neutral'"
            @click="selectKind(opt.value)"
          >
            {{ opt.label }}
          </UButton>
        </div>
      </div>
    </div>
    <UiEmptyState
      v-if="resultCount === 0"
      description="Nothing carries this label right now, which means contributors already closed these gaps. There is still plenty to do below."
      icon="lucide:party-popper"
      title="All flagged gaps are closed"
    />
    <div v-else class="flex flex-col gap-8">
      <section v-if="issues.length">
        <h2 class="font-title text-xl mb-3 text-primary-950">
          Issues &amp; solutions ({{ issues.length }})
        </h2>
        <div class="flex flex-col gap-4">
          <div v-for="issue in issues" :key="`i-${issue.id}`">
            <div class="flex flex-wrap gap-1 mb-1">
              <UBadge
                v-for="l in issue.helpLabels"
                :key="l"
                color="warning"
                size="sm"
                variant="soft"
                :icon="LABEL_META[l]?.icon"
              >
                {{ LABEL_META[l]?.title ?? l }}
              </UBadge>
            </div>
            <CardIssue :issue="issue" />
          </div>
        </div>
      </section>
      <section v-if="caseStudies.length">
        <h2 class="font-title text-xl mb-3 text-primary-950">
          Case studies ({{ caseStudies.length }})
        </h2>
        <div class="flex flex-col gap-4">
          <div v-for="cs in caseStudies" :key="`c-${cs.id}`">
            <div class="flex flex-wrap gap-1 mb-1">
              <UBadge
                v-for="l in cs.helpLabels"
                :key="l"
                color="warning"
                size="sm"
                variant="soft"
                :icon="LABEL_META[l]?.icon"
              >
                {{ LABEL_META[l]?.title ?? l }}
              </UBadge>
            </div>
            <CardCaseStudy :study="cs" />
          </div>
        </div>
      </section>
    </div>
    <!-- Always-on ways to contribute, whatever the label queue looks like -->
    <section class="mt-10">
      <UiSectionTitle class="mb-4">
        More ways to help
      </UiSectionTitle>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <NuxtLink
          v-for="way in alwaysWays"
          :key="way.to"
          class="group flex flex-col gap-1.5 rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm p-4 hover:border-primary-200 transition-colors"
          :to="way.to"
          @click="track(way.event)"
        >
          <span class="flex items-center gap-2 font-mono text-sm text-gray-900">
            <UIcon class="size-4 text-primary-600" :name="way.icon" />
            <span>
              {{ way.label }}
            </span>
            <UIcon
              class="size-3.5 ml-auto text-gray-300 group-hover:text-primary-500 transition-colors"
              name="lucide:arrow-right"
            />
          </span>
          <span class="text-xs text-gray-500 leading-snug">
            {{ way.description }}
          </span>
        </NuxtLink>
      </div>
    </section>
  </AppContainer>
</template>
