<script setup lang="ts">
const { track } = useUmami()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const { user } = useUserSession()

definePageMeta({
  middleware: ['auth'],
})

useSeoMeta({
  title: 'Welcome - CommunityFix',
  description: 'Tell us about your skills and interests so we can point you at the right issues.',
})

const STEPS = [
  {
    title: 'Your skills',
    icon: 'lucide:award',
    description:
      'Registering skills lets us point you at issues where you can have real impact. ' +
      'You can add proof and details later in your profile.',
  },
  {
    title: 'Your interests',
    icon: 'lucide:sparkles',
    description:
      'What do you care about? Anything goes, even topics the catalog does not cover ' +
      'yet. We use these to surface issues and wins that matter to you.',
  },
  {
    title: 'Newsletter',
    icon: 'lucide:mail',
    description:
      'Get a short digest of what happened, tuned to your skills and interests. ' +
      'We only collect your preference here, you can change it anytime in settings.',
  },
] as const

const TOTAL_STEPS = STEPS.length

// Allow landing on a specific step (?step=2), e.g. from a settings link.
const initialStep = Number(route.query.step)
const step = ref(initialStep >= 1 && initialStep <= TOTAL_STEPS ? initialStep : 1)
const done = ref(false)

const currentStep = computed(() => STEPS[step.value - 1]!)

const firstName = computed(() => user.value?.name?.trim().split(/\s+/)[0] || '')
const welcomeTitle = computed(() => (firstName.value ? `Welcome, ${firstName.value}` : 'Welcome'))

// Steps slide left going forward, right going back.
const direction = ref<'forward' | 'back'>('forward')

function goTo(target: number) {
  if (target === step.value || target < 1 || target > TOTAL_STEPS) return
  direction.value = target > step.value ? 'forward' : 'back'
  step.value = target
}

// Keep the URL in sync so a refresh lands back on the same step.
watch(step, (s) => {
  router.replace({ query: { ...route.query, step: s === 1 ? undefined : String(s) } })
})

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

// Tap-to-fill examples teaching the skill + area format, shown until the
// first skill lands (mirrors the "Popular" row in the interests editor).
const SKILL_EXAMPLES = [
  { title: 'Structural engineering', area: 'Civil engineering' },
  { title: 'Grant writing', area: 'Fundraising' },
  { title: 'Community organizing', area: 'Social work' },
  { title: 'Water quality testing', area: 'Environmental science' },
]

function fillSkillExample(example: { title: string; area: string }) {
  skillDraft.title = example.title
  skillDraft.area = example.area
}

function fetchErrorMessage(error: unknown, fallback: string): string {
  const e = error as { data?: { statusMessage?: string }; message?: string }
  return e?.data?.statusMessage || e?.message || fallback
}

async function addSkill(): Promise<boolean> {
  const title = skillDraft.title.trim()
  const area = skillDraft.area.trim()
  if (!title || !area) {
    toast.add({ title: 'Skill and area are both needed', color: 'warning' })
    return false
  }
  addingSkill.value = true
  try {
    await $fetch('/api/qualifications', { method: 'POST', body: { title, area } })
    track('Credential added')
    skillDraft.title = ''
    skillDraft.area = ''
    await refreshQuals()
    return true
  } catch (error) {
    toast.add({
      title: 'Could not add skill',
      description: fetchErrorMessage(error, 'Please try again.'),
      color: 'error',
    })
    return false
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

// Live per-step counts shown as chips in the stepper.
const stepCounts = computed(() => [quals.value?.length ?? 0, interestCount.value, 0])

// Step 3: newsletter, saved through the shared component on finish.
const newsletterRef = useTemplateRef('newsletter')

const finishing = ref(false)

async function stampOnboarded() {
  await $fetch('/api/me/onboarded', { method: 'POST' }).catch(() => {})
}

async function continueStep() {
  // Don't lose a skill the user typed but never added.
  if (step.value === 1 && skillDraft.title.trim() && skillDraft.area.trim()) {
    const added = await addSkill()
    if (!added) return
  }
  if (stepCounts.value[step.value - 1] === 0) {
    track('Onboarding skipped', { step: step.value })
  }
  goTo(step.value + 1)
}

async function skipAll() {
  track('Onboarding skipped', { step: step.value, all: true })
  await stampOnboarded()
  await navigateTo('/')
}

async function finish() {
  finishing.value = true
  try {
    const saved = await newsletterRef.value?.save()
    if (saved === false) return
    await stampOnboarded()
    track('Onboarding completed', {
      skills: quals.value?.length ?? 0,
      interests: interestCount.value,
      newsletter: newsletterRef.value?.enabled || false,
    })
    done.value = true
  } finally {
    finishing.value = false
  }
}

const doneSummary = computed(() => {
  const parts: string[] = []
  const skills = quals.value?.length ?? 0
  if (skills > 0) parts.push(`${skills} skill${skills === 1 ? '' : 's'}`)
  if (interestCount.value > 0) {
    parts.push(`${interestCount.value} interest${interestCount.value === 1 ? '' : 's'}`)
  }
  if (parts.length === 0) {
    return 'You can add skills and interests anytime from your settings.'
  }
  return `We'll use your ${parts.join(' and ')} to surface issues where you can make a real difference.`
})
</script>

<template>
  <AppContainer>
    <UiPageHeader
      :description="done
        ? 'That is everything we need for now.'
        : 'Three quick steps so we can point you at the right issues. All of it is optional.'"
      :title="welcomeTitle"
    />
    <template v-if="!done">
      <nav aria-label="Onboarding steps" class="mb-6">
        <div class="mb-3 flex items-center justify-between">
          <span class="font-mono text-xs uppercase tracking-widest text-gray-400">
            Step {{ step }} of {{ TOTAL_STEPS }}
          </span>
          <UButton color="neutral" size="xs" variant="ghost" @click="skipAll">
            Skip for now
          </UButton>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="(s, i) in STEPS"
            :key="s.title"
            class="group text-left"
            type="button"
            :aria-current="step === i + 1 ? 'step' : undefined"
            :aria-label="`Go to step ${i + 1}: ${s.title}`"
            @click="goTo(i + 1)"
          >
            <span
              class="block h-1 w-full transition-colors"
              :class="i + 1 <= step ? 'bg-primary-500' : 'bg-gray-200 group-hover:bg-gray-300'"
            />
            <span class="mt-2 flex items-baseline gap-2">
              <span
                class="font-mono text-xs transition-colors"
                :class="i + 1 === step ? 'text-primary-600' : 'text-gray-400'"
              >
                0{{ i + 1 }}
              </span>
              <span
                class="hidden truncate text-sm transition-colors sm:inline"
                :class="i + 1 === step ? 'text-gray-900 font-medium' : 'text-gray-400 group-hover:text-gray-600'"
              >
                {{ s.title }}
              </span>
              <span
                v-if="stepCounts[i]"
                class="rounded-full border border-primary-200 bg-primary-50 px-1.5 font-mono text-[11px] leading-4 text-primary-600"
              >
                {{ stepCounts[i] }}
              </span>
            </span>
          </button>
        </div>
      </nav>
      <Transition mode="out-in" :name="`step-${direction}`">
        <section :key="step">
          <UiCard class="relative overflow-hidden" padding="lg">
            <span
              aria-hidden="true"
              class="pointer-events-none absolute -top-4 right-2 select-none font-mono text-8xl font-medium text-gray-200/60"
            >
              0{{ step }}
            </span>
            <div class="relative flex flex-col gap-5">
              <div class="flex items-start gap-4">
                <div class="flex size-11 shrink-0 items-center justify-center rounded-lg border border-primary-100 bg-primary-50 text-primary-600">
                  <UIcon class="size-5" :name="currentStep.icon" />
                </div>
                <div>
                  <UiSectionTitle>
                    {{ currentStep.title }}
                  </UiSectionTitle>
                  <p class="mt-1 text-sm text-gray-600">
                    {{ currentStep.description }}
                  </p>
                </div>
              </div>
              <!-- Step 1: skills -->
              <template v-if="step === 1">
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
                  <UButton
                    color="primary"
                    icon="lucide:plus"
                    size="lg"
                    type="submit"
                    :loading="addingSkill"
                  >
                    Add
                  </UButton>
                </form>
                <div v-if="!quals?.length" class="flex flex-wrap items-center gap-2">
                  <span class="font-mono text-xs uppercase tracking-widest text-gray-400">
                    Try
                  </span>
                  <button
                    v-for="example in SKILL_EXAMPLES"
                    :key="example.title"
                    type="button"
                    @click="fillSkillExample(example)"
                  >
                    <UiTag size="sm" variant="neutral">
                      {{ example.title }}
                    </UiTag>
                  </button>
                </div>
              </template>
              <!-- Step 2: interests -->
              <UserInterestsEditor v-else-if="step === 2" @update:count="interestCount = $event" />
              <!-- Step 3: newsletter -->
              <UserNewsletterPrefs v-else ref="newsletter" />
            </div>
          </UiCard>
          <div class="mt-4 flex items-center justify-between">
            <UButton
              v-if="step > 1"
              color="neutral"
              icon="lucide:arrow-left"
              variant="ghost"
              @click="goTo(step - 1)"
            >
              Back
            </UButton>
            <span v-else />
            <UButton
              v-if="step < TOTAL_STEPS"
              color="primary"
              trailing-icon="lucide:arrow-right"
              :loading="addingSkill"
              @click="continueStep"
            >
              Continue
            </UButton>
            <UButton
              v-else
              color="primary"
              trailing-icon="lucide:check"
              :loading="finishing"
              @click="finish"
            >
              Finish
            </UButton>
          </div>
        </section>
      </Transition>
    </template>
    <!-- Done -->
    <Transition appear name="step-forward">
      <section v-if="done">
        <UiCard class="text-center" padding="lg">
          <div class="mx-auto flex size-12 items-center justify-center rounded-xl border border-primary-100 bg-primary-50 text-primary-600">
            <UIcon class="size-6" name="lucide:check" />
          </div>
          <h2 class="mt-4 font-mono text-2xl font-medium">
            You're all set
          </h2>
          <p class="mx-auto mt-2 max-w-md text-sm text-gray-600">
            {{ doneSummary }}
          </p>
          <div class="mt-6 flex flex-wrap justify-center gap-3">
            <UButton color="primary" to="/contribute" trailing-icon="lucide:arrow-right">
              See where you can help
            </UButton>
            <UButton color="neutral" to="/" variant="ghost">
              Explore the catalog
            </UButton>
          </div>
        </UiCard>
      </section>
    </Transition>
  </AppContainer>
</template>

<style scoped>
.step-forward-enter-active, .step-forward-leave-active, .step-back-enter-active, .step-back-leave-active {
  transition: opacity .2s, transform .2s;
}

.step-forward-enter-from {
  opacity: 0;
  transform: translateX(1.5rem);
}

.step-forward-leave-to {
  opacity: 0;
  transform: translateX(-1.5rem);
}

.step-back-enter-from {
  opacity: 0;
  transform: translateX(-1.5rem);
}

.step-back-leave-to {
  opacity: 0;
  transform: translateX(1.5rem);
}
</style>
