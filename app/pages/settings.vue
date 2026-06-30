<script setup lang="ts">
const { track } = useUmami()
const { user, fetch: fetchUserSession, clear } = useUserSession()
const toast = useToast()

// Narrow the unknown errors thrown by `$fetch` so we can read the message
// the API returned without resorting to `any`.
function fetchErrorMessage(error: unknown, fallback: string): string {
  const e = error as { data?: { statusMessage?: string }; message?: string }
  return e?.data?.statusMessage || e?.message || fallback
}

const savingProfile = ref(false)
const name = ref(user.value?.name || '')
const headline = ref('')
const bio = ref('')
const location = ref('')

// Pull existing profile (the session only carries name + email). useFetch
// auto-refetches whenever a watched value changes, which would request
// `/api/user/undefined` whenever the session ref briefly transitions through
// undefined. useAsyncData lets us short-circuit the fetcher.
const { data: profile, refresh: refreshProfile } = await useAsyncData(
  'settings-profile',
  () =>
    user.value?.id
      ? $fetch(`/api/user/${user.value.id}` as '/api/user/:id')
      : Promise.resolve(null),
  { watch: [() => user.value?.id] },
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
  } catch (error) {
    toast.add({
      title: 'Failed to save',
      description: fetchErrorMessage(error, 'Please try again.'),
      color: 'error',
    })
  } finally {
    savingProfile.value = false
  }
}

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
  } catch (error) {
    toast.add({
      title: 'Save failed',
      description: fetchErrorMessage(error, 'Please try again.'),
      color: 'error',
    })
  } finally {
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
  } catch (error) {
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
  const subject = encodeURIComponent(`Credential verification - [${user.value?.id ?? 'unknown'}]`)
  return `mailto:support@communityfix.org?subject=${subject}`
})

async function shareEndorseLink() {
  const id = user.value?.id
  if (!id) return
  const url = `${window.location.origin}/user/${id}?endorse=1`
  const shareData = {
    title: 'Endorse my credentials on CommunityFix',
    text: `Vouch for ${name.value || 'my'} credentials on CommunityFix.`,
    url,
  }
  if (navigator.share) {
    try {
      await navigator.share(shareData)
      track('Share endorse link', { method: 'native' })
      return
    } catch {
      // User dismissed share sheet — fall through to clipboard fallback.
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    track('Share endorse link', { method: 'clipboard' })
    toast.add({
      title: 'Link copied!',
      description: 'Share it with people who can vouch for your credentials.',
      color: 'success',
    })
  } catch {
    toast.add({
      title: 'Copy failed',
      description: 'Unable to copy link to clipboard',
      color: 'error',
    })
  }
}

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
    <UiPageHeader
      description="Tell the community who you are and what skills you bring to the table."
      title="Edit profile"
    >
      <div class="mt-4 flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-widest text-gray-500">
        <span class="inline-flex items-center gap-1.5">
          <UIcon
            class="size-3.5"
            name="lucide:shield-check"
            :class="isTrusted ? 'text-primary-600' : 'text-gray-400'"
          />
          <span :class="isTrusted ? 'text-primary-700' : ''">
            {{ isTrusted ? 'Trusted endorser' : 'Not yet endorsed' }}
          </span>
        </span>
        <span class="text-gray-300">
          ·
        </span>
        <span>
          {{ totalEndorsements }} endorsement{{ totalEndorsements === 1 ? '' : 's' }} received
        </span>
      </div>
    </UiPageHeader>
    <section class="mb-12">
      <div class="mb-4 flex items-baseline gap-3">
        <span class="font-mono text-xs uppercase tracking-widest text-primary-600">
          01
        </span>
        <UiSectionTitle>
          Identity
        </UiSectionTitle>
      </div>
      <UiCard class="flex flex-col gap-6" padding="lg">
        <div class="flex items-center gap-4 pb-4 border-b border-gray-100">
          <img
            class="size-16 rounded-full"
            :alt="`${name || 'avatar'}`"
            :src="`https://api.dicebear.com/9.x/glass/svg?seed=${user?.id || 'anonymous'}`"
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
        <form class="grid gap-4" @submit.prevent="saveProfile">
          <UFormField label="Name" name="name">
            <UInput
              v-model="name"
              autocomplete="name"
              class="w-full"
              placeholder="Your name"
              size="lg"
              type="text"
            />
          </UFormField>
          <UFormField
            hint="One line, shown under your name everywhere"
            label="Headline"
            name="headline"
          >
            <UInput
              v-model="headline"
              class="w-full"
              placeholder="e.g. Civil engineer focused on water systems"
              size="lg"
              type="text"
              :maxlength="120"
            />
          </UFormField>
          <UFormField label="Location" name="location">
            <UInput
              v-model="location"
              class="w-full"
              placeholder="e.g. Brussels, BE"
              size="lg"
              type="text"
              :maxlength="120"
            />
          </UFormField>
          <UFormField hint="What you care about and what you've built" label="Bio" name="bio">
            <UTextarea
              v-model="bio"
              class="w-full"
              placeholder="A few sentences about your work, interests, and what brought you here."
              size="lg"
              :maxlength="2000"
              :rows="5"
            />
          </UFormField>
          <UFormField hint="Contact us if you need to change this" label="Email" name="email">
            <UInput class="w-full" disabled size="lg" type="email" :model-value="user?.email" />
          </UFormField>
          <UButton block color="primary" size="lg" type="submit" :loading="savingProfile">
            Save identity
          </UButton>
        </form>
      </UiCard>
    </section>
    <section class="mb-12">
      <div class="mb-4 flex items-baseline gap-3">
        <span class="font-mono text-xs uppercase tracking-widest text-primary-600">
          02
        </span>
        <UiSectionTitle>
          Credentials
        </UiSectionTitle>
      </div>
      <p class="text-sm text-gray-600 mb-4 max-w-2xl">
        List the skills, training and lived experience you bring. Other endorsed members
        can vouch for each one — the more endorsements, the more weight your voice carries
        in the community.
      </p>
      <div
        v-if="quals && quals.length > 0"
        class="mb-3 flex items-start gap-3 rounded-2xl border border-primary-200 bg-primary-50/60 p-4"
      >
        <UIcon class="size-4 text-primary-600 mt-0.5 shrink-0" name="lucide:share-2" />
        <p class="flex-1 text-xs text-primary-900 leading-relaxed">
          <span class="font-mono uppercase tracking-wide">
            Ask people to vouch for you —
          </span>
          share a direct link to your profile so colleagues, clients or peers
          can endorse the credentials they know first-hand.
        </p>
        <UButton
          class="shrink-0 -mt-1"
          color="primary"
          icon="lucide:share-2"
          size="xs"
          variant="ghost"
          @click="shareEndorseLink"
        >
          Share
        </UButton>
      </div>
      <div class="mb-5 flex items-start gap-3 rounded-2xl border border-primary-200 bg-primary-50/60 p-4">
        <UIcon class="size-4 text-primary-600 mt-0.5 shrink-0" name="lucide:badge-check" />
        <p class="text-xs text-primary-900 leading-relaxed">
          <span class="font-mono uppercase tracking-wide">
            Need a head start? —
          </span>
          email your proofs (diplomas, registrations, references, links) to
          <a
            class="font-mono underline decoration-primary underline-offset-2 hover:text-primary-700"
            :href="verificationMailto"
            @click="track('Email credential verification')"
          >
            support@communityfix.org
          </a>
          and the team will endorse the matching credential on your behalf.
        </p>
      </div>
      <div v-if="quals && quals.length > 0" class="flex flex-col gap-3 mb-4">
        <UiCard v-for="q in quals" :key="q.id" padding="md">
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
              <div class="mt-3 flex items-center gap-3 text-xs font-mono text-gray-500">
                <span
                  v-if="q.isVerified"
                  class="inline-flex items-center gap-1.5 text-primary-600"
                  title="Verified by the CommunityFix team"
                >
                  <UIcon class="size-3.5" name="lucide:badge-check" />
                  Verified
                </span>
                <span class="inline-flex items-center gap-1.5">
                  <UIcon
                    class="size-3.5"
                    name="lucide:check-circle-2"
                    :class="q.endorsementCount > 0 ? 'text-primary-600' : 'text-gray-400'"
                  />
                  {{ q.endorsementCount }} endorsement{{ q.endorsementCount === 1 ? '' : 's' }}
                </span>
              </div>
            </div>
            <UButton
              class="shrink-0"
              color="error"
              icon="lucide:trash-2"
              size="xs"
              variant="ghost"
              @click="deleteQualification(q.id)"
            >
              Delete
            </UButton>
          </div>
        </UiCard>
      </div>
      <div
        v-else-if="!newOpen"
        class="rounded-2xl border border-dashed border-gray-300 bg-white/40 p-8 text-center mb-4"
      >
        <UIcon class="size-8 text-gray-400 mx-auto" name="lucide:award" />
        <p class="font-mono text-sm uppercase tracking-wide text-gray-500 mt-3">
          No credentials yet
        </p>
        <p class="text-sm text-gray-500 mt-1">
          Add your first one to start building trust.
        </p>
      </div>
      <UiCard v-if="newOpen" class="border-primary/40 ring-1 ring-primary/20" padding="md">
        <form class="grid gap-3" @submit.prevent="submitQualification">
          <p class="font-mono text-xs uppercase tracking-widest text-primary-600 mb-1">
            New credential
          </p>
          <UFormField label="Title" name="title" required>
            <UInput
              v-model="draft.title"
              class="w-full"
              placeholder="e.g. 10 years as structural engineer"
              size="md"
              :maxlength="120"
            />
          </UFormField>
          <UFormField label="Area" name="area" required>
            <UInput
              v-model="draft.area"
              class="w-full"
              placeholder="e.g. civil engineering"
              size="md"
              :maxlength="60"
            />
          </UFormField>
          <UFormField hint="Optional — context, proof, links" label="Detail" name="detail">
            <UTextarea
              v-model="draft.detail"
              class="w-full"
              placeholder="Where you trained, what you worked on, anything that helps others verify your claim."
              size="md"
              :maxlength="1000"
              :rows="4"
            />
          </UFormField>
          <div class="flex gap-2 justify-end pt-1">
            <UButton color="neutral" size="sm" variant="ghost" @click="cancelDraft">
              Cancel
            </UButton>
            <UButton color="primary" size="sm" type="submit" :loading="submittingQual">
              Add credential
            </UButton>
          </div>
        </form>
      </UiCard>
      <UButton
        v-else
        block
        class="rounded-2xl border-dashed"
        color="primary"
        icon="lucide:plus"
        size="lg"
        variant="outline"
        @click="startNew"
      >
        Add a credential
      </UButton>
    </section>
    <section>
      <div class="mb-4 flex items-baseline gap-3">
        <span class="font-mono text-xs uppercase tracking-widest text-primary-600">
          03
        </span>
        <UiSectionTitle>
          Session
        </UiSectionTitle>
      </div>
      <UiCard class="flex flex-col gap-4" padding="lg">
        <NuxtLink
          class="inline-flex items-center gap-2 text-primary-700 hover:underline font-mono text-sm"
          :to="`/user/${user?.id}`"
          @click="track('View own profile')"
        >
          <UIcon class="size-4" name="lucide:external-link" />
          View public profile
        </NuxtLink>
        <UiDivider text="account" />
        <UButton block color="error" icon="lucide:log-out" size="lg" variant="soft" @click="logout">
          Log out
        </UButton>
      </UiCard>
    </section>
  </AppContainer>
</template>
