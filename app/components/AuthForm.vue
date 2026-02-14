<script setup lang="ts">
const props = withDefaults(defineProps<{
  mode?: 'login' | 'register'
}>(), {
  mode: 'login',
})

const email = ref('')
const toast = useToast()
const activeProvider = ref<string | null>(null)
const isPasskeyLoading = ref(false)

const { openInPopup, fetch: fetchUserSession } = useUserSession()
const { register: registerPasskey, authenticate } = useWebAuthn({
  registerEndpoint: '/api/webauthn/register',
  authenticateEndpoint: '/api/webauthn/authenticate',
})

const title = computed(() => props.mode === 'login' ? 'Sign in' : 'Create account')
const lead = computed(() => props.mode === 'login'
  ? 'Email only. Use a passkey or single-tap social login.'
  : 'No passwords. Register with email + passkey or OAuth.')
const passkeyLabel = computed(() => props.mode === 'login' ? 'Continue with passkey' : 'Create passkey')

const trimmedEmail = computed(() => email.value.trim())

function ensureEmail() {
  if (trimmedEmail.value) { return true }
  toast.add({
    title: 'Add your email',
    description: 'We bind your passkey to this email.',
    color: 'warning',
  })
  return false
}

async function handlePasskey() {
  if (!ensureEmail()) { return }

  isPasskeyLoading.value = true
  try {
    if (props.mode === 'login') {
      await authenticate(trimmedEmail.value)
      toast.add({ title: 'Passkey verified', color: 'success' })
    }
    else {
      await registerPasskey({ userName: trimmedEmail.value })
      toast.add({ title: 'Passkey created', color: 'success' })
    }
    await fetchUserSession()
  }
  catch (error: any) {
    console.error(error)
    toast.add({
      title: 'Passkey failed',
      description: error?.message || 'Try again or use social login.',
      color: 'error',
    })
  }
  finally {
    isPasskeyLoading.value = false
  }
}

async function startOAuth(provider: 'google' | 'apple') {
  activeProvider.value = provider
  const route = `/auth/${provider}`

  try {
    if (openInPopup) {
      openInPopup(route)
    }
    else {
      await navigateTo(route)
    }
  }
  catch (error: any) {
    console.error(error)
    toast.add({
      title: 'Could not start login',
      description: 'Check your OAuth config and try again.',
      color: 'error',
    })
  }
  finally {
    activeProvider.value = null
  }
}
</script>

<template>
  <section class="w-full max-w-md mx-auto">
    <UiPageHeader
      :title="title"
      :description="lead"
      center
    />

    <UiCard
      padding="lg"
      class="flex flex-col gap-5"
    >
      <form
        class="grid gap-4"
        @submit.prevent="handlePasskey"
      >
        <UFormGroup
          label="Email"
          name="email"
        >
          <UInput
            v-model="email"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
            size="lg"
            required
          />
        </UFormGroup>

        <UButton
          type="submit"
          block
          size="lg"
          color="primary"
          icon="i-lucide-key-round"
          :loading="isPasskeyLoading"
        >
          {{ passkeyLabel }}
        </UButton>
      </form>

      <UiDivider text="or continue with" />

      <div class="grid grid-cols-2 gap-3">
        <UButton
          block
          variant="soft"
          color="neutral"
          icon="i-fa6-brands-google"
          :loading="activeProvider === 'google'"
          @click="startOAuth('google')"
        >
          Google
        </UButton>
        <UButton
          block
          variant="soft"
          color="neutral"
          icon="i-fa6-brands-apple"
          :loading="activeProvider === 'apple'"
          @click="startOAuth('apple')"
        >
          Apple
        </UButton>
      </div>

      <p class="text-xs text-center text-gray-400 font-mono">
        Passwordless by design
      </p>
    </UiCard>

    <p class="mt-6 text-center text-sm text-gray-500">
      {{ props.mode === 'login' ? "Don't have an account?" : 'Already have an account?' }}
      <NuxtLink
        :to="props.mode === 'login' ? '/register' : '/login'"
        class="text-primary-600 hover:underline font-medium"
      >
        {{ props.mode === 'login' ? 'Create one' : 'Sign in' }}
      </NuxtLink>
    </p>
  </section>
</template>
