<script setup lang="ts">
const { track } = useUmami()
const toast = useToast()

definePageMeta({
  middleware: ['auth'],
})

useSeoMeta({
  title: 'Welcome - CommunityFix',
  description: 'Tell us about your skills and interests so we can point you at the right issues.',
})

const TOTAL_STEPS = 3

// Allow landing on a specific step (?step=2), e.g. from a settings link.
const route = useRoute()
const initialStep = Number(route.query.step)
const step = ref(initialStep >= 1 && initialStep <= TOTAL_STEPS ? initialStep : 1)

const stepTitles = ['Your skills', 'Your interests', 'Newsletter']

// Step 1: skills, backed by the qualifications API.
type Qualification = {
  id: number
  title: string
  area: string
  detail: string | null
  endorsementCount: number
  isVerified: boolean
  createdAt: string
}

const { data: quals, refresh: refreshQuals } =
  await useFetch<Qualification[]>('/api/qualifications/me')

const skillDraft = reactive({ title: '', area: '' })
const addingSkill = ref(false)

function fetchErrorMessage(error: unknown, fallback: string): string {
  const e = error as { data?: { statusMessage?: string }; message?: string }
  return e?.data?.statusMessage || e?.message || fallback
}

async function addSkill() {
  const title = skillDraft.title.trim()
  const area = skillDraft.area.trim()
  if (!title || !area) {
    toast.add({ title: 'Skill and area are both needed', color: 'warning' })
    return
  }
  addingSkill.value = true
  try {
    await $fetch('/api/qualifications', { method: 'POST', body: { title, area } })
    track('Credential added')
    skillDraft.title = ''
    skillDraft.area = ''
    await refreshQuals()
  } catch (error) {
    toast.add({
      title: 'Could not add skill',
      description: fetchErrorMessage(error, 'Please try again.'),
      color: 'error',
    })
  } finally {
    addingSkill.value = false
  }
}

async function removeSkill(id: number) {
  try {
    await $fetch(`/api/qualifications/${id}` as '/api/qualifications/:id', { method: 'DELETE' })
    track('Credential deleted', { id })
    await refreshQuals()
  } catch (error) {
    toast.add({
      title: 'Could not remove skill',
      description: fetchErrorMessage(error, 'Please try again.'),
      color: 'error',
    })
  }
}

// Step 2: interests count, reported by the shared editor.
const interestCount = ref(0)

// Step 3: newsletter, saved through the shared component on finish.
const newsletterRef = useTemplateRef('newsletter')

const finishing = ref(false)

async function stampOnboarded() {
  await $fetch('/api/me/onboarded', { method: 'POST' }).catch(() => {})
}

function skipStep() {
  track('Onboarding skipped', { step: step.value })
  if (step.value < TOTAL_STEPS) {
    step.value += 1
  } else {
    finish(true)
  }
}

async function skipAll() {
  track('Onboarding skipped', { step: step.value })
  await stampOnboarded()
  await navigateTo('/')
}

async function finish(skippedLast = false) {
  finishing.value = true
  try {
    if (!skippedLast) {
      const saved = await newsletterRef.value?.save()
      if (saved === false) return
    }
    await stampOnboarded()
    track('Onboarding completed', {
      skills: quals.value?.length ?? 0,
      interests: interestCount.value,
      newsletter: (!skippedLast && newsletterRef.value?.enabled) || false,
    })
    await navigateTo('/')
  } finally {
    finishing.value = false
  }
}
</script>

<template>
  <AppContainer>
    <UiPageHeader
      description="Three quick steps so we can point you at the right issues. All of it is optional."
      title="Welcome"
    />
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span
          v-for="n in TOTAL_STEPS"
          :key="n"
          class="font-mono text-xs uppercase tracking-widest transition-colors"
          :class="n === step ? 'text-primary-600' : 'text-gray-400'"
        >
          0{{ n }}
          <span class="normal-case tracking-normal hidden sm:inline">
            {{ stepTitles[n - 1] }}
          </span>
        </span>
      </div>
      <UButton color="neutral" size="xs" variant="ghost" @click="skipAll">
        Skip for now
      </UButton>
    </div>
    <!-- Step 1: skills -->
    <section v-if="step === 1">
      <UiCard class="flex flex-col gap-5" padding="lg">
        <div>
          <UiSectionTitle>
            Your skills
          </UiSectionTitle>
          <p class="text-sm text-gray-600 mt-2">
            Registering skills lets us point you at issues where you can have real impact.
            You can add proof and details later in your profile.
          </p>
        </div>
        <div v-if="quals && quals.length > 0" class="flex flex-col gap-2">
          <div
            v-for="q in quals"
            :key="q.id"
            class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white/60 px-3 py-2"
          >
            <div class="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span class="text-sm font-medium truncate">
                {{ q.title }}
              </span>
              <UiBadge variant="primary">
                {{ q.area }}
              </UiBadge>
            </div>
            <UButton
              color="error"
              icon="lucide:x"
              size="xs"
              variant="ghost"
              :aria-label="`Remove ${q.title}`"
              @click="removeSkill(q.id)"
            />
          </div>
        </div>
        <form class="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" @submit.prevent="addSkill">
          <UInput
            v-model="skillDraft.title"
            placeholder="Skill, e.g. structural engineering"
            size="lg"
            :maxlength="120"
          />
          <UInput
            v-model="skillDraft.area"
            placeholder="Area, e.g. civil engineering"
            size="lg"
            :maxlength="60"
          />
          <UButton color="primary" icon="lucide:plus" size="lg" type="submit" :loading="addingSkill">
            Add
          </UButton>
        </form>
      </UiCard>
      <div class="mt-4 flex justify-between">
        <UButton color="neutral" variant="ghost" @click="skipStep">
          Skip this step
        </UButton>
        <UButton color="primary" trailing-icon="lucide:arrow-right" @click="step = 2">
          Continue
        </UButton>
      </div>
    </section>
    <!-- Step 2: interests -->
    <section v-else-if="step === 2">
      <UiCard class="flex flex-col gap-5" padding="lg">
        <div>
          <UiSectionTitle>
            Your interests
          </UiSectionTitle>
          <p class="text-sm text-gray-600 mt-2">
            What do you care about? Anything goes, even topics the catalog does not cover
            yet. We use these to surface issues and wins that matter to you.
          </p>
        </div>
        <UserInterestsEditor @update:count="interestCount = $event" />
      </UiCard>
      <div class="mt-4 flex justify-between">
        <UButton color="neutral" variant="ghost" @click="skipStep">
          Skip this step
        </UButton>
        <UButton color="primary" trailing-icon="lucide:arrow-right" @click="step = 3">
          Continue
        </UButton>
      </div>
    </section>
    <!-- Step 3: newsletter -->
    <section v-else>
      <UiCard class="flex flex-col gap-5" padding="lg">
        <div>
          <UiSectionTitle>
            Newsletter
          </UiSectionTitle>
          <p class="text-sm text-gray-600 mt-2">
            Get a short digest of what happened, tuned to your skills and interests.
            We only collect your preference here, you can change it anytime in settings.
          </p>
        </div>
        <UserNewsletterPrefs ref="newsletter" />
      </UiCard>
      <div class="mt-4 flex justify-between">
        <UButton color="neutral" variant="ghost" @click="skipStep">
          Skip this step
        </UButton>
        <UButton color="primary" trailing-icon="lucide:check" :loading="finishing" @click="finish()">
          Finish
        </UButton>
      </div>
    </section>
  </AppContainer>
</template>
