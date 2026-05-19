<script setup lang="ts">
const route = useRoute()
const userId = route.params.id as string
const toast = useToast()
const { track } = useUmami()

// Narrow the unknown errors thrown by `$fetch` so we can read the API
// statusMessage without resorting to `any`.
function fetchErrorMessage(error: unknown, fallback: string): string {
  const e = error as { data?: { statusMessage?: string }, message?: string }
  return e?.data?.statusMessage || e?.message || fallback
}

const { data: user, refresh } = await useFetch(`/api/user/${userId}` as '/api/user/:id')

const displayName = computed(() => user.value?.name || 'Anonymous')
const joinedDate = computed(() => {
  if (!user.value?.createdAt) return ''
  return new Date(user.value.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
  })
})

const totalContributions = computed(
  () => (user.value?.issues?.length ?? 0) + (user.value?.solutions?.length ?? 0),
)

// Endorsement actions ─────────────────────────────────
const endorsing = ref<number | null>(null)

async function endorse(qualificationId: number) {
  if (!user.value?.viewer.isAuthenticated) {
    toast.add({ title: 'Sign in to endorse credentials', color: 'warning' })
    return
  }
  endorsing.value = qualificationId
  try {
    await $fetch(`/api/qualifications/${qualificationId}/endorse` as '/api/qualifications/:id/endorse', {
      method: 'POST',
    })
    track('Credential endorsed', { qualificationId })
    await refresh()
  }
  catch (error) {
    toast.add({
      title: 'Could not endorse',
      description: fetchErrorMessage(error, 'Please try again.'),
      color: 'error',
    })
  }
  finally {
    endorsing.value = null
  }
}

async function unendorse(qualificationId: number) {
  endorsing.value = qualificationId
  try {
    await $fetch(`/api/qualifications/${qualificationId}/endorse` as '/api/qualifications/:id/endorse', {
      method: 'DELETE',
    })
    track('Credential un-endorsed', { qualificationId })
    await refresh()
  }
  catch (error) {
    toast.add({
      title: 'Could not undo endorsement',
      description: fetchErrorMessage(error, 'Please try again.'),
      color: 'error',
    })
  }
  finally {
    endorsing.value = null
  }
}

useSeoMeta({
  title: () => `${displayName.value} - CommunityFix`,
  description: () => user.value?.headline
    || `View ${displayName.value}'s profile and contributions on CommunityFix.`,
  ogTitle: () => `${displayName.value} - CommunityFix`,
  ogDescription: () => user.value?.headline
    || `View ${displayName.value}'s profile and contributions on CommunityFix.`,
  ogType: 'profile',
})
</script>

<template>
  <AppContainer>
    <template v-if="user">
      <!-- ── Hero ──────────────────────────────────────── -->
      <header class="mt-10 mb-12 flex flex-col items-center text-center gap-5">
        <img
          :src="`https://api.dicebear.com/9.x/glass/svg?seed=${displayName}`"
          :alt="`${displayName}'s avatar`"
          class="size-28 rounded-full"
        >
        <div>
          <h1 class="font-mono text-4xl sm:text-5xl underline decoration-primary">
            {{ displayName }}
          </h1>
          <p
            v-if="user.headline"
            class="mt-3 text-lg sm:text-xl font-title text-primary-950 max-w-xl"
          >
            {{ user.headline }}
          </p>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-mono uppercase tracking-widest text-gray-500">
          <span
            v-if="user.location"
            class="inline-flex items-center gap-1.5"
          >
            <UIcon
              name="lucide:map-pin"
              class="size-3.5"
            />
            {{ user.location }}
          </span>
          <span
            v-if="user.location"
            class="text-gray-300"
          >·</span>
          <span>Joined {{ joinedDate }}</span>
        </div>

        <!-- Owner edit shortcut -->
        <NuxtLink
          v-if="user.viewer.isOwner"
          to="/settings"
          class="inline-flex items-center gap-1.5 text-sm font-mono text-primary-700 hover:underline mt-1"
          @click="track('Edit own profile')"
        >
          <UIcon
            name="lucide:pencil"
            class="size-3.5"
          />
          Edit profile
        </NuxtLink>
      </header>

      <!-- ── Stats strip ───────────────────────────────── -->
      <UiCard
        padding="md"
        class="mb-10"
      >
        <dl class="grid grid-cols-3 divide-x divide-gray-200">
          <div class="text-center px-2">
            <dt class="font-mono text-[10px] uppercase tracking-widest text-gray-500">
              Trust score
            </dt>
            <dd class="font-mono text-2xl mt-1 text-primary-700 tabular-nums">
              {{ user.trustScore }}
            </dd>
          </div>
          <div class="text-center px-2">
            <dt class="font-mono text-[10px] uppercase tracking-widest text-gray-500">
              Endorsements
            </dt>
            <dd class="font-mono text-2xl mt-1 tabular-nums">
              {{ user.endorsementsReceived }}
            </dd>
          </div>
          <div class="text-center px-2">
            <dt class="font-mono text-[10px] uppercase tracking-widest text-gray-500">
              Contributions
            </dt>
            <dd class="font-mono text-2xl mt-1 tabular-nums">
              {{ totalContributions }}
            </dd>
          </div>
        </dl>
      </UiCard>

      <!-- ── Bio ───────────────────────────────────────── -->
      <section
        v-if="user.bio"
        class="mb-12"
      >
        <div class="mb-4 flex items-baseline gap-3">
          <span class="font-mono text-xs uppercase tracking-widest text-primary-600">01</span>
          <UiSectionTitle>About</UiSectionTitle>
        </div>
        <UiCard padding="lg">
          <p class="text-gray-700 leading-relaxed whitespace-pre-line">
            {{ user.bio }}
          </p>
        </UiCard>
      </section>

      <!-- ── Credentials ───────────────────────────────── -->
      <section class="mb-12">
        <div class="mb-4 flex items-baseline gap-3">
          <span class="font-mono text-xs uppercase tracking-widest text-primary-600">
            {{ user.bio ? '02' : '01' }}
          </span>
          <UiSectionTitle>Credentials</UiSectionTitle>
        </div>

        <div
          v-if="user.qualifications.length > 0"
          class="flex flex-col gap-3"
        >
          <UiCard
            v-for="q in user.qualifications"
            :key="q.id"
            padding="md"
          >
            <div class="flex items-start gap-4">
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 class="font-title text-lg leading-tight">
                    {{ q.title }}
                  </h3>
                  <UiBadge variant="primary">
                    {{ q.area }}
                  </UiBadge>
                </div>
                <p
                  v-if="q.detail"
                  class="text-sm text-gray-600 mt-2 leading-relaxed whitespace-pre-line"
                >
                  {{ q.detail }}
                </p>
                <div class="mt-3 flex items-center gap-1.5 text-xs font-mono text-gray-500">
                  <UIcon
                    name="lucide:check-circle-2"
                    class="size-3.5"
                    :class="q.endorsementCount > 0 ? 'text-primary-600' : 'text-gray-400'"
                  />
                  <span>
                    {{ q.endorsementCount }}
                    endorsement{{ q.endorsementCount === 1 ? '' : 's' }}
                  </span>
                </div>
              </div>

              <!-- Endorse / unendorse button -->
              <div class="shrink-0">
                <template v-if="user.viewer.isOwner">
                  <span class="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                    Your credential
                  </span>
                </template>
                <template v-else-if="q.viewerHasEndorsed">
                  <UButton
                    size="sm"
                    color="primary"
                    variant="soft"
                    icon="lucide:check"
                    :loading="endorsing === q.id"
                    @click="unendorse(q.id)"
                  >
                    Endorsed
                  </UButton>
                </template>
                <template v-else>
                  <UButton
                    size="sm"
                    color="primary"
                    variant="outline"
                    icon="lucide:thumbs-up"
                    :disabled="!user.viewer.canEndorse"
                    :loading="endorsing === q.id"
                    :title="!user.viewer.isAuthenticated
                      ? 'Sign in to endorse credentials'
                      : !user.viewer.canEndorse
                        ? 'You need at least one endorsement on your own credentials before you can endorse others'
                        : ''"
                    @click="endorse(q.id)"
                  >
                    Endorse
                  </UButton>
                </template>
              </div>
            </div>
          </UiCard>

          <!-- Gating notice for unauthenticated / un-endorsed viewers -->
          <p
            v-if="!user.viewer.isOwner && user.viewer.isAuthenticated && !user.viewer.canEndorse"
            class="text-xs text-gray-500 font-mono mt-1"
          >
            <UIcon
              name="lucide:info"
              class="size-3.5 inline -mt-0.5 mr-1"
            />
            You'll be able to endorse once your own credentials get at least one endorsement.
          </p>
        </div>

        <div
          v-else
          class="rounded-2xl border border-dashed border-gray-300 bg-white/40 p-8 text-center"
        >
          <UIcon
            name="lucide:award"
            class="size-8 text-gray-400 mx-auto"
          />
          <p class="font-mono text-sm uppercase tracking-wide text-gray-500 mt-3">
            No credentials listed yet
          </p>
          <NuxtLink
            v-if="user.viewer.isOwner"
            to="/settings"
            class="mt-2 inline-block text-sm text-primary-700 hover:underline"
          >
            Add your first one →
          </NuxtLink>
        </div>
      </section>

      <!-- ── Contributions ─────────────────────────────── -->
      <section
        v-if="user.issues.length > 0"
        class="mb-12"
      >
        <div class="mb-4 flex items-baseline gap-3">
          <span class="font-mono text-xs uppercase tracking-widest text-primary-600">
            {{ user.bio ? '03' : '02' }}
          </span>
          <UiSectionTitle>
            {{ user.issues.length }} issue{{ user.issues.length === 1 ? '' : 's' }} submitted
          </UiSectionTitle>
        </div>
        <div class="flex flex-col gap-6">
          <CardIssue
            v-for="issue in user.issues"
            :key="issue.id"
            :issue="issue"
          />
        </div>
      </section>

      <section
        v-if="user.solutions.length > 0"
        class="mb-12"
      >
        <div class="mb-4 flex items-baseline gap-3">
          <span class="font-mono text-xs uppercase tracking-widest text-primary-600">
            {{ user.bio ? (user.issues.length > 0 ? '04' : '03') : (user.issues.length > 0 ? '03' : '02') }}
          </span>
          <UiSectionTitle>
            {{ user.solutions.length }} solution{{ user.solutions.length === 1 ? '' : 's' }} proposed
          </UiSectionTitle>
        </div>
        <div class="flex flex-col gap-6">
          <CardSolution
            v-for="solution in user.solutions"
            :key="solution.id"
            :solution="solution"
            show-parent
          />
        </div>
      </section>

      <div
        v-if="user.issues.length === 0 && user.solutions.length === 0"
        class="text-center text-gray-500 mt-12"
      >
        <p class="font-mono text-sm uppercase tracking-wide">
          No contributions yet
        </p>
      </div>
    </template>

    <div
      v-else
      class="w-full my-28 text-center"
    >
      <p class="text-lg text-gray-500">
        User not found.
      </p>
    </div>
  </AppContainer>
</template>
