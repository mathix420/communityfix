<script setup lang="ts">
const { track } = useUmami()
const { user, fetch: fetchUserSession, clear } = useUserSession()
const toast = useToast()

// Narrow the unknown errors thrown by `$fetch` so we can read the message
// the API returned without resorting to `any`.
function fetchErrorMessage(error: unknown, fallback: string): string {
  const e = error as { data?: { statusMessage?: string }, message?: string }
  return e?.data?.statusMessage || e?.message || fallback
}

// ── Identity form ─────────────────────────────────────
const savingProfile = ref(false)
const name = ref(user.value?.name || '')
const headline = ref('')
const bio = ref('')
const location = ref('')

// Pull existing profile (the session only carries name + email).
const { data: profile, refresh: refreshProfile } = await useFetch(
  () => `/api/user/${user.value?.id}` as '/api/user/:id',
  { immediate: !!user.value?.id },
)
watchEffect(() => {
  if (profile.value) {
    name.value = profile.value.name || ''
    headline.value = profile.value.headline || ''
    bio.value = profile.value.bio || ''
    location.value = profile.value.location || ''
  }
})

async function saveProfile() {
  savingProfile.value = true
  try {
    await $fetch('/api/user/profile', {
      method: 'PUT',
      body: {
        name: name.value,
        headline: headline.value,
        bio: bio.value,
        location: location.value,
      },
    })
    track('Profile saved')
    await Promise.all([fetchUserSession(), refreshProfile()])
    toast.add({ title: 'Profile updated', color: 'success' })
  }
  catch (error) {
    toast.add({
      title: 'Failed to save',
      description: fetchErrorMessage(error, 'Please try again.'),
      color: 'error',
    })
  }
  finally {
    savingProfile.value = false
  }
}

// ── Qualifications ────────────────────────────────────
type Qualification = {
  id: number
  title: string
  area: string
  detail: string | null
  endorsementCount: number
  createdAt: string
}

const { data: quals, refresh: refreshQuals } = await useFetch<Qualification[]>(
  '/api/qualifications/me',
)

// Credentials are immutable: users can add new ones and delete existing ones,
// but never edit them. This sidesteps the entire endorsement-reset problem —
// every credential row represents a single, fixed claim that endorsements
// were given against.
const draft = reactive({ title: '', area: '', detail: '' })
const submittingQual = ref(false)
const newOpen = ref(false)

function startNew() {
  newOpen.value = true
  draft.title = ''
  draft.area = ''
  draft.detail = ''
  track('Open add credential')
}

function cancelDraft() {
  newOpen.value = false
  draft.title = ''
  draft.area = ''
  draft.detail = ''
}

async function submitQualification() {
  const title = draft.title.trim()
  const area = draft.area.trim()
  if (!title || !area) {
    toast.add({ title: 'Title and area are required', color: 'warning' })
    return
  }
  submittingQual.value = true
  try {
    await $fetch('/api/qualifications', {
      method: 'POST',
      body: { title, area, detail: draft.detail },
    })
    track('Credential added')
    toast.add({ title: 'Credential added', color: 'success' })
    await refreshQuals()
    cancelDraft()
  }
  catch (error) {
    toast.add({
      title: 'Save failed',
      description: fetchErrorMessage(error, 'Please try again.'),
      color: 'error',
    })
  }
  finally {
    submittingQual.value = false
  }
}

async function deleteQualification(id: number) {
  if (!confirm('Delete this credential? Endorsements on it will also be removed.')) return
  try {
    await $fetch(`/api/qualifications/${id}` as '/api/qualifications/:id', { method: 'DELETE' })
    track('Credential deleted', { id })
    await refreshQuals()
    toast.add({ title: 'Credential removed', color: 'success' })
  }
  catch (error) {
    toast.add({
      title: 'Delete failed',
      description: fetchErrorMessage(error, 'Please try again.'),
      color: 'error',
    })
  }
}

const totalEndorsements = computed(
  () => quals.value?.reduce((sum, q) => sum + q.endorsementCount, 0) ?? 0,
)
const isTrusted = computed(() => totalEndorsements.value > 0)

async function logout() {
  track('Log out')
  await clear()
  await navigateTo('/login')
}

// Pre-build the verification mailto so the support team can match the email
// to a user account without round-tripping. The user ID is the only stable
// identifier — name/email may change or be missing.
const verificationMailto = computed(() => {
  const subject = encodeURIComponent(
    `Credential verification - [${user.value?.id ?? 'unknown'}]`,
  )
  return `mailto:support@communityfix.org?subject=${subject}`
})

useSeoMeta({
  title: 'Edit profile - CommunityFix',
  description: 'Manage your CommunityFix profile, credentials and account settings.',
})

definePageMeta({
  middleware: ['auth'],
})
</script>

<template>
  <AppContainer>
    <!-- ── Page header ─────────────────────────────────── -->
    <UiPageHeader
      title="Edit profile"
      description="Tell the community who you are and what skills you bring to the table."
    >
      <div class="mt-4 flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-widest text-gray-500">
        <span class="inline-flex items-center gap-1.5">
          <UIcon
            name="lucide:shield-check"
            class="size-3.5"
            :class="isTrusted ? 'text-primary-600' : 'text-gray-400'"
          />
          <span :class="isTrusted ? 'text-primary-700' : ''">
            {{ isTrusted ? 'Trusted endorser' : 'Not yet endorsed' }}
          </span>
        </span>
        <span class="text-gray-300">·</span>
        <span>{{ totalEndorsements }} endorsement{{ totalEndorsements === 1 ? '' : 's' }} received</span>
      </div>
    </UiPageHeader>

    <!-- ── 01 / Identity ───────────────────────────────── -->
    <section class="mb-12">
      <div class="mb-4 flex items-baseline gap-3">
        <span class="font-mono text-xs uppercase tracking-widest text-primary-600">01</span>
        <UiSectionTitle>Identity</UiSectionTitle>
      </div>

      <UiCard
        padding="lg"
        class="flex flex-col gap-6"
      >
        <!-- Avatar + headline preview -->
        <div class="flex items-center gap-4 pb-4 border-b border-gray-100">
          <img
            :src="`https://api.dicebear.com/9.x/glass/svg?seed=${name || user?.email}`"
            :alt="`${name || 'avatar'}`"
            class="size-16 rounded-full"
          >
          <div class="min-w-0">
            <p class="font-mono text-lg leading-tight truncate">
              {{ name || 'Anonymous' }}
            </p>
            <p class="text-sm text-gray-500 truncate">
              {{ headline || 'Add a headline below' }}
            </p>
          </div>
        </div>

        <form
          class="grid gap-4"
          @submit.prevent="saveProfile"
        >
          <UFormField
            label="Name"
            name="name"
          >
            <UInput
              v-model="name"
              type="text"
              placeholder="Your name"
              autocomplete="name"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Headline"
            name="headline"
            hint="One line, shown under your name everywhere"
          >
            <UInput
              v-model="headline"
              type="text"
              placeholder="e.g. Civil engineer focused on water systems"
              size="lg"
              class="w-full"
              :maxlength="120"
            />
          </UFormField>

          <UFormField
            label="Location"
            name="location"
          >
            <UInput
              v-model="location"
              type="text"
              placeholder="e.g. Brussels, BE"
              size="lg"
              class="w-full"
              :maxlength="120"
            />
          </UFormField>

          <UFormField
            label="Bio"
            name="bio"
            hint="What you care about and what you've built"
          >
            <UTextarea
              v-model="bio"
              placeholder="A few sentences about your work, interests, and what brought you here."
              size="lg"
              class="w-full"
              :rows="5"
              :maxlength="2000"
            />
          </UFormField>

          <UFormField
            label="Email"
            name="email"
            hint="Contact us if you need to change this"
          >
            <UInput
              :model-value="user?.email"
              type="email"
              size="lg"
              class="w-full"
              disabled
            />
          </UFormField>

          <UButton
            type="submit"
            block
            size="lg"
            color="primary"
            :loading="savingProfile"
          >
            Save identity
          </UButton>
        </form>
      </UiCard>
    </section>

    <!-- ── 02 / Credentials ────────────────────────────── -->
    <section class="mb-12">
      <div class="mb-4 flex items-baseline gap-3">
        <span class="font-mono text-xs uppercase tracking-widest text-primary-600">02</span>
        <UiSectionTitle>Credentials</UiSectionTitle>
      </div>

      <p class="text-sm text-gray-600 mb-4 max-w-2xl">
        List the skills, training and lived experience you bring. Other endorsed members
        can vouch for each one — the more endorsements, the more weight your voice carries
        in the community.
      </p>

      <!-- Verification CTA -->
      <div class="mb-5 flex items-start gap-3 rounded-2xl border border-primary-200 bg-primary-50/60 p-4">
        <UIcon
          name="lucide:badge-check"
          class="size-4 text-primary-600 mt-0.5 shrink-0"
        />
        <p class="text-xs text-primary-900 leading-relaxed">
          <span class="font-mono uppercase tracking-wide">Need a head start? —</span>
          email your proofs (diplomas, registrations, references, links) to
          <a
            :href="verificationMailto"
            class="font-mono underline decoration-primary underline-offset-2 hover:text-primary-700"
            @click="track('Email credential verification')"
          >support@communityfix.org</a>
          and the team will endorse the matching credential on your behalf.
        </p>
      </div>

      <!-- Existing credentials -->
      <div
        v-if="quals && quals.length > 0"
        class="flex flex-col gap-3 mb-4"
      >
        <UiCard
          v-for="q in quals"
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
                class="text-sm text-gray-600 mt-1.5 leading-relaxed whitespace-pre-line"
              >
                {{ q.detail }}
              </p>
              <div class="mt-3 flex items-center gap-1.5 text-xs font-mono text-gray-500">
                <UIcon
                  name="lucide:check-circle-2"
                  class="size-3.5"
                  :class="q.endorsementCount > 0 ? 'text-primary-600' : 'text-gray-400'"
                />
                <span>{{ q.endorsementCount }} endorsement{{ q.endorsementCount === 1 ? '' : 's' }}</span>
              </div>
            </div>
            <UButton
              variant="ghost"
              color="error"
              size="xs"
              icon="lucide:trash-2"
              class="shrink-0"
              @click="deleteQualification(q.id)"
            >
              Delete
            </UButton>
          </div>
        </UiCard>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!newOpen"
        class="rounded-2xl border border-dashed border-gray-300 bg-white/40 p-8 text-center mb-4"
      >
        <UIcon
          name="lucide:award"
          class="size-8 text-gray-400 mx-auto"
        />
        <p class="font-mono text-sm uppercase tracking-wide text-gray-500 mt-3">
          No credentials yet
        </p>
        <p class="text-sm text-gray-500 mt-1">
          Add your first one to start building trust.
        </p>
      </div>

      <!-- New credential form -->
      <UiCard
        v-if="newOpen"
        padding="md"
        class="border-primary/40 ring-1 ring-primary/20"
      >
        <form
          class="grid gap-3"
          @submit.prevent="submitQualification"
        >
          <p class="font-mono text-xs uppercase tracking-widest text-primary-600 mb-1">
            New credential
          </p>
          <UFormField
            label="Title"
            name="title"
            required
          >
            <UInput
              v-model="draft.title"
              size="md"
              class="w-full"
              placeholder="e.g. 10 years as structural engineer"
              :maxlength="120"
            />
          </UFormField>
          <UFormField
            label="Area"
            name="area"
            required
          >
            <UInput
              v-model="draft.area"
              size="md"
              class="w-full"
              placeholder="e.g. civil engineering"
              :maxlength="60"
            />
          </UFormField>
          <UFormField
            label="Detail"
            name="detail"
            hint="Optional — context, proof, links"
          >
            <UTextarea
              v-model="draft.detail"
              size="md"
              class="w-full"
              :rows="4"
              placeholder="Where you trained, what you worked on, anything that helps others verify your claim."
              :maxlength="1000"
            />
          </UFormField>
          <div class="flex gap-2 justify-end pt-1">
            <UButton
              variant="ghost"
              color="neutral"
              size="sm"
              @click="cancelDraft"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              size="sm"
              color="primary"
              :loading="submittingQual"
            >
              Add credential
            </UButton>
          </div>
        </form>
      </UiCard>

      <UButton
        v-else
        block
        variant="outline"
        color="primary"
        size="lg"
        icon="lucide:plus"
        class="rounded-2xl border-dashed"
        @click="startNew"
      >
        Add a credential
      </UButton>
    </section>

    <!-- ── 03 / Session ─────────────────────────────────── -->
    <section>
      <div class="mb-4 flex items-baseline gap-3">
        <span class="font-mono text-xs uppercase tracking-widest text-primary-600">03</span>
        <UiSectionTitle>Session</UiSectionTitle>
      </div>

      <UiCard
        padding="lg"
        class="flex flex-col gap-4"
      >
        <NuxtLink
          :to="`/user/${user?.id}`"
          class="inline-flex items-center gap-2 text-primary-700 hover:underline font-mono text-sm"
          @click="track('View own profile')"
        >
          <UIcon
            name="lucide:external-link"
            class="size-4"
          />
          View public profile
        </NuxtLink>

        <UiDivider text="account" />

        <UButton
          block
          variant="soft"
          color="error"
          size="lg"
          icon="lucide:log-out"
          @click="logout"
        >
          Log out
        </UButton>
      </UiCard>
    </section>
  </AppContainer>
</template>
