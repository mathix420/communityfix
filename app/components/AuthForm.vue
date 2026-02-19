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

const title = computed(() => props.mode === 'login' ? 'Welcome back' : 'Create account')
const lead = computed(() => props.mode === 'login'
  ? 'Sign in to pick up where you left off.'
  : 'Join thousands fixing their communities. It takes seconds.')
const passkeyLabel = computed(() => props.mode === 'login' ? 'Sign in with passkey' : 'Create passkey')

const trimmedEmail = computed(() => email.value.trim())

function ensureEmail() {
  if (trimmedEmail.value) { return true }
  toast.add({
    title: 'Add your email',
    description: 'We need your email to create your account.',
    color: 'warning',
  })
  return false
}

async function handlePasskey() {
  if (props.mode === 'register' && !ensureEmail()) { return }

  isPasskeyLoading.value = true
  try {
    if (props.mode === 'login') {
      await authenticate()
    }
    else {
      await registerPasskey({ userName: trimmedEmail.value })
    }
    await fetchUserSession()
    umami.track(props.mode === 'login' ? 'Sign in with passkey' : 'Register with passkey')
    await navigateTo(props.mode === 'register' ? '/settings' : '/')
  }
  catch (error: any) {
    console.error(error)
    umami.track('Passkey failed', { mode: props.mode })
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
  umami.track(`Sign in with ${provider}`)
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
        <UFormField
          v-if="props.mode === 'register'"
          label="Email"
          name="email"
        >
          <UInput
            v-model="email"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
            size="lg"
            class="w-full"
            required
          />
        </UFormField>

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
        :data-umami-event="props.mode === 'login' ? 'Switch to register' : 'Switch to login'"
      >
        {{ props.mode === 'login' ? 'Create one' : 'Sign in' }}
      </NuxtLink>
    </p>
  </section>
</template>
