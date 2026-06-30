<script setup lang="ts">
import type { InboxEntry } from '../composables/usePendingRevisions'
import type { RevisionStatus } from '../../server/database/schema'

const { user } = useUserSession()
const { track } = useUmami()
const { toReview, mine } = usePendingRevisions()
const { markSeen } = useDashboardAttention()

const { data: o } = await useFetch('/api/me/overview', {
  default: () => ({
    name: null as string | null,
    trustScore: 0,
    memberSince: null as string | null,
    issues: 0,
    solutions: 0,
    caseStudies: 0,
    editsMerged: 0,
    openProposals: 0,
    topics: [] as { slug: string; count: number }[],
  }),
})

// Landing on the dashboard is what "reading" the updates means — clear the dot.
onMounted(() => markSeen())

const firstName = computed(
  () => (o.value.name || user.value?.name || '').trim().split(/\s+/)[0] || null,
)
const profileLink = computed(() => (user.value?.id ? `/user/${user.value.id}` : '/settings'))
const avatarUrl = computed(
  () =>
    `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(user.value?.id || firstName.value || 'me')}`,
)
const memberSince = computed(() =>
  o.value.memberSince
    ? new Date(o.value.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null,
)

const stats = computed(() => [
  { label: 'Issues', value: o.value.issues, to: profileLink.value, accent: false },
  { label: 'Solutions', value: o.value.solutions, to: profileLink.value, accent: false },
  { label: 'Case studies', value: o.value.caseStudies, to: profileLink.value, accent: false },
  { label: 'Edits merged', value: o.value.editsMerged, to: undefined, accent: true },
])

function nodeLink(entry: InboxEntry) {
  return entry.node.targetKind === 'issue'
    ? `/issue/${entry.node.issueId}`
    : `/case-study/${entry.node.caseStudyId}`
}

function formatRelative(date: string | null | undefined) {
  if (!date) return ''
  const d = new Date(date)
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 30) return `${diffD}d`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// A unified, chronological recap of changes: my proposals + their decisions, and
// edits other people have sent to nodes I own.
type ActivityKind = 'incoming' | 'proposed' | 'approved' | 'rejected' | 'withdrawn' | 'superseded'
interface Activity {
  id: string
  kind: ActivityKind
  label: string
  at: string
  link: string
  who?: string
}

const activity = computed<Activity[]>(() => {
  const events: Activity[] = []
  for (const e of mine.value) {
    events.push({
      id: `m${e.id}p`,
      kind: 'proposed',
      label: e.node.label,
      at: e.createdAt,
      link: nodeLink(e),
    })
    if (e.decidedAt && (e.status === 'approved' || e.status === 'rejected')) {
      events.push({
        id: `m${e.id}d`,
        kind: e.status,
        label: e.node.label,
        at: e.decidedAt,
        link: nodeLink(e),
      })
    }
  }
  for (const e of toReview.value) {
    events.push({
      id: `r${e.id}`,
      kind: 'incoming',
      label: e.node.label,
      at: e.createdAt,
      link: nodeLink(e),
      who: e.proposer?.name || 'Someone',
    })
  }
  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 8)
})

const activityMeta: Record<ActivityKind, { icon: string; ring: string; tint: string }> = {
  incoming: {
    icon: 'lucide:git-pull-request-arrow',
    ring: 'bg-blue-50 text-blue-600',
    tint: 'text-blue-600',
  },
  proposed: {
    icon: 'lucide:pencil-line',
    ring: 'bg-gray-100 text-gray-500',
    tint: 'text-gray-500',
  },
  approved: { icon: 'lucide:check', ring: 'bg-green-50 text-green-600', tint: 'text-green-600' },
  rejected: { icon: 'lucide:x', ring: 'bg-red-50 text-red-500', tint: 'text-red-500' },
  withdrawn: { icon: 'lucide:undo-2', ring: 'bg-gray-100 text-gray-400', tint: 'text-gray-400' },
  superseded: { icon: 'lucide:layers', ring: 'bg-gray-100 text-gray-400', tint: 'text-gray-400' },
}

function activityVerb(a: Activity) {
  switch (a.kind) {
    case 'incoming':
      return `${a.who} suggested an edit`
    case 'proposed':
      return 'You proposed an edit'
    case 'approved':
      return 'Your edit was approved'
    case 'rejected':
      return 'Your edit was declined'
    case 'withdrawn':
      return 'You withdrew an edit'
    default:
      return 'Superseded'
  }
}

const statusVariant: Record<RevisionStatus, 'default' | 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  withdrawn: 'default',
  superseded: 'default',
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

useSeoMeta({
  title: 'Dashboard - CommunityFix',
  description:
    'Your contributions, the suggestions awaiting your review, and the edits you have proposed.',
})

definePageMeta({
  middleware: ['auth'],
})
</script>

<template>
  <AppContainer>
    <p class="mb-5 font-mono text-xs uppercase tracking-[0.25em] text-gray-400">
      Dashboard
    </p>
    <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:auto-rows-[minmax(10.5rem,1fr)]">
      <!-- IDENTITY HERO -->
      <section
        class="tile col-span-2 flex flex-col overflow-hidden rounded-3xl border border-gray-200/80 bg-neutral-100 p-6 lg:row-span-2"
        style="animation-delay: 0ms"
      >
        <div class="grainy pointer-events-none absolute inset-0 opacity-70" />
        <div class="pointer-events-none absolute -right-5 -top-10 select-none font-mono text-[9rem] leading-none text-neutral-900/[0.04]">
          #
        </div>
        <div class="relative flex items-center gap-4">
          <img
            alt="Your avatar"
            class="size-14 rounded-2xl bg-white ring-1 ring-gray-200"
            :src="avatarUrl"
          >
          <div class="min-w-0">
            <p class="font-mono text-[11px] uppercase tracking-[0.22em] text-primary-600">
              Welcome back
            </p>
            <p class="truncate font-mono text-3xl uppercase leading-tight tracking-tight text-neutral-900">
              {{ firstName || 'Maker' }}
            </p>
          </div>
        </div>
        <div class="relative mt-5 flex flex-wrap gap-2">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-mono text-xs text-gray-600 ring-1 ring-gray-200">
            <UIcon class="size-3.5 text-primary-600" name="lucide:badge-check" />
            Trust {{ o.trustScore }}
          </span>
          <span
            v-if="memberSince"
            class="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-mono text-xs text-gray-600 ring-1 ring-gray-200"
          >
            <UIcon class="size-3.5 text-gray-400" name="lucide:calendar" />
            Since {{ memberSince }}
          </span>
          <span
            v-if="o.openProposals"
            class="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-mono text-xs text-gray-600 ring-1 ring-gray-200"
          >
            <UIcon class="size-3.5 text-gray-400" name="lucide:loader" />
            {{ o.openProposals }} open
          </span>
        </div>
        <div class="relative mt-auto flex flex-wrap gap-2 pt-6">
          <NuxtLink
            class="inline-flex items-center gap-1.5 rounded-full bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            :to="profileLink"
            @click="track('Dashboard see profile')"
          >
            <UIcon class="size-4" name="lucide:user" />
            See profile
          </NuxtLink>
          <NuxtLink
            class="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            to="/settings"
            @click="track('Dashboard edit profile')"
          >
            <UIcon class="size-4" name="lucide:settings-2" />
            Edit profile
          </NuxtLink>
        </div>
      </section>
      <!-- STAT TILES -->
      <component
        :is="s.to ? 'NuxtLink' : 'div'"
        v-for="(s, i) in stats"
        :key="s.label"
        class="tile group flex flex-col justify-between rounded-3xl border border-gray-200/80 bg-white p-5 transition-all"
        :class="s.to ? 'hover:-translate-y-0.5 hover:border-gray-300' : ''"
        :style="{ animationDelay: `${60 + i * 45}ms` }"
        :to="s.to"
      >
        <div class="flex items-center justify-between">
          <span class="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-300">
            {{ pad(i + 1) }}
          </span>
          <UIcon
            v-if="s.to"
            class="size-4 text-gray-300 transition-colors group-hover:text-primary-500"
            name="lucide:arrow-up-right"
          />
        </div>
        <div>
          <div
            class="font-mono text-4xl leading-none tabular-nums sm:text-5xl"
            :class="s.accent ? 'text-primary-600' : 'text-neutral-900'"
          >
            {{ s.value }}
          </div>
          <div class="mt-1.5 text-sm text-gray-500">
            {{ s.label }}
          </div>
        </div>
      </component>
      <!-- NEEDS YOUR REVIEW -->
      <section
        class="tile col-span-2 flex flex-col rounded-3xl border border-gray-200/80 bg-white p-6 lg:row-span-2"
        style="animation-delay: 240ms"
      >
        <div class="mb-4 flex items-center justify-between">
          <h2 class="flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-neutral-900">
            <UIcon class="size-4 text-primary-600" name="lucide:scale" />
            Needs your review
          </h2>
          <span
            v-if="toReview.length"
            class="inline-flex min-w-5 items-center justify-center rounded-full bg-primary-600 px-1.5 py-0.5 font-mono text-[11px] leading-none text-white"
          >
            {{ toReview.length }}
          </span>
        </div>
        <ul
          v-if="toReview.length"
          class="-mr-2 flex max-h-80 flex-col divide-y divide-gray-100 overflow-y-auto pr-2 scrollbar-hide"
        >
          <li v-for="entry in toReview" :key="entry.id">
            <NuxtLink
              class="group flex items-start gap-3 py-3 transition-colors"
              :to="nodeLink(entry)"
            >
              <span class="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <UIcon class="size-3.5" name="lucide:git-pull-request-arrow" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium text-neutral-900 group-hover:text-primary-600">
                  {{ entry.node.label }}
                </span>
                <span class="block truncate text-xs text-gray-500">
                  {{ entry.proposer?.name || 'Anonymous' }} · {{ formatRelative(entry.createdAt) }}
                </span>
              </span>
              <UIcon
                class="mt-1.5 size-4 shrink-0 text-gray-300 transition-colors group-hover:text-primary-500"
                name="lucide:arrow-right"
              />
            </NuxtLink>
          </li>
        </ul>
        <div v-else class="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <UIcon class="size-7 text-gray-300" name="lucide:inbox" />
          <p class="mt-2 text-sm text-gray-500">
            All clear — nothing waiting on you.
          </p>
        </div>
      </section>
      <!-- RECENT ACTIVITY -->
      <section
        class="tile col-span-2 flex flex-col rounded-3xl border border-gray-200/80 bg-white p-6 lg:row-span-2"
        style="animation-delay: 300ms"
      >
        <h2 class="mb-4 flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-neutral-900">
          <UIcon class="size-4 text-primary-600" name="lucide:activity" />
          Recent activity
        </h2>
        <ul
          v-if="activity.length"
          class="-mr-2 flex max-h-80 flex-col divide-y divide-gray-100 overflow-y-auto pr-2 scrollbar-hide"
        >
          <li v-for="a in activity" :key="a.id">
            <NuxtLink class="group flex items-start gap-3 py-3" :to="a.link">
              <span
                class="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full"
                :class="activityMeta[a.kind].ring"
              >
                <UIcon class="size-3.5" :name="activityMeta[a.kind].icon" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm text-neutral-700">
                  <span :class="activityMeta[a.kind].tint">
                    {{ activityVerb(a) }}
                  </span>
                </span>
                <span class="block truncate text-xs text-gray-500 group-hover:text-primary-600">
                  {{ a.label }}
                </span>
              </span>
              <span class="mt-0.5 shrink-0 font-mono text-[11px] text-gray-400">
                {{ formatRelative(a.at) }}
              </span>
            </NuxtLink>
          </li>
        </ul>
        <div v-else class="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <UIcon class="size-7 text-gray-300" name="lucide:wind" />
          <p class="mt-2 text-sm text-gray-500">
            No activity yet.
          </p>
          <NuxtLink
            class="mt-3 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-primary-600 hover:underline"
            to="/"
            @click="track('Dashboard browse tree')"
          >
            Browse the tree
            <UIcon class="size-3.5" name="lucide:arrow-right" />
          </NuxtLink>
        </div>
      </section>
      <!-- YOUR TOPICS -->
      <section
        class="tile col-span-2 rounded-3xl border border-gray-200/80 bg-white p-6 lg:col-span-4"
        style="animation-delay: 360ms"
      >
        <div class="mb-4 flex items-baseline gap-3">
          <h2 class="flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-neutral-900">
            <UIcon class="size-4 text-primary-600" name="lucide:hash" />
            Your topics
          </h2>
          <span class="font-mono text-[11px] text-gray-400">
            tags you contribute to
          </span>
        </div>
        <div v-if="o.topics.length" class="flex flex-wrap gap-2">
          <NuxtLink
            v-for="t in o.topics"
            :key="t.slug"
            class="group inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 py-1.5 pl-3 pr-2 text-sm transition-colors hover:border-primary-300 hover:bg-primary-50"
            :to="`/tag/${t.slug}`"
            @click="track('Dashboard topic click', { tag: t.slug })"
          >
            <span class="text-gray-700 group-hover:text-primary-700">
              <span class="text-gray-400">
                #
              </span>
              {{ t.slug }}
            </span>
            <span class="inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 font-mono text-[11px] text-gray-500 ring-1 ring-gray-200">
              {{ t.count }}
            </span>
          </NuxtLink>
        </div>
        <div v-else class="flex items-center gap-3 text-sm text-gray-500">
          <UIcon class="size-5 text-gray-300" name="lucide:compass" />
          <span>
            No topics yet —
            <NuxtLink
              class="text-primary-600 hover:underline"
              to="/new"
              @click="track('Dashboard start issue')"
            >
              start an issue
            </NuxtLink>
            to stake out your areas.
          </span>
        </div>
      </section>
    </div>
  </AppContainer>
</template>

<style scoped>
@keyframes tile-rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}
/* `backwards` holds the hidden state through the stagger delay, then releases to
   the element's normal styles — so per-tile hover transforms stay intact. */
.tile {
  position: relative;
  animation: .55s cubic-bezier(.2, .7, .2, 1) backwards tile-rise;
}

@media (prefers-reduced-motion: reduce) {
  .tile {
    animation: none;
  }
}
</style>
