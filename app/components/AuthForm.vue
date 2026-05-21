<script setup lang="ts">
const props = withDefaults(defineProps<{
  mode?: 'login' | 'register'
}>(), {
  mode: 'login',
})

const { track } = useUmami()
const route = useRoute()
const email = ref('')
const code = ref('')
const step = ref<'email' | 'code'>('email')
const toast = useToast()
const activeProvider = ref<string | null>(null)
const isPasskeyLoading = ref(false)
const isSendingCode = ref(false)
const isVerifying = ref(false)

const { fetch: fetchUserSession } = useUserSession()

// If the user landed here via an auth gate (?redirect=/foo), stash the path
// server-side so it survives full-page OAuth round-trips. Passkey reads it
// back via GET /api/_auth/post-login-redirect; OAuth callbacks consume the
// same cookie via consumePostLoginRedirect.
onMounted(() => {
  const r = route.query.redirect
  if (typeof r === 'string' && r.startsWith('/') && !r.startsWith('//')) {
    $fetch('/api/_auth/post-login-redirect', { method: 'POST', body: { url: r } }).catch(() => {})
  }
})
const { register: registerPasskey, authenticate } = useWebAuthn({
  registerEndpoint: '/api/webauthn/register',
  authenticateEndpoint: '/api/webauthn/authenticate',
})

const title = computed(() => props.mode === 'login' ? 'Welcome back' : 'Create account')
const lead = computed(() => props.mode === 'login'
  ? 'Sign in to pick up where you left off.'
  : 'Join thousands fixing their communities. It takes seconds.')

const trimmedEmail = computed(() => email.value.trim())

function fetchErrorMessage(error: any, fallback: string): string {
  return error?.data?.message || error?.message || fallback
}

function ensureEmail() {
  if (trimmedEmail.value) { return true }
  toast.add({
    title: 'Add your email',
    description: 'We need your email to create your account.',
    color: 'warning',
  })
  return false
}

async function postLoginNavigate() {
  const { url: continueUrl } = await $fetch<{ url: string }>('/api/_auth/post-login-redirect').catch(() => ({ url: '' }))
  await navigateTo(continueUrl || (props.mode === 'register' ? '/settings' : '/'))
}

async function handleLogin() {
  isPasskeyLoading.value = true
  try {
    await authenticate()
    await fetchUserSession()
    track('Sign in with passkey')
    await postLoginNavigate()
  }
  catch (error: any) {
    console.error(error)
    track('Passkey failed', { mode: props.mode })
    toast.add({
      title: 'Passkey failed',
      description: fetchErrorMessage(error, 'Try again or use social login.'),
      color: 'error',
    })
  }
  finally {
    isPasskeyLoading.value = false
  }
}

async function sendCode() {
  if (!ensureEmail()) return
  isSendingCode.value = true
  try {
    await $fetch('/api/_auth/email-pin/send', {
      method: 'POST',
      body: { email: trimmedEmail.value },
    })
    step.value = 'code'
    code.value = ''
    track('Email pin sent')
    toast.add({
      title: 'Check your email',
      description: `We sent a 6-digit code to ${trimmedEmail.value}.`,
      color: 'success',
    })
  }
  catch (error: any) {
    console.error(error)
    toast.add({
      title: 'Could not send code',
      description: fetchErrorMessage(error, 'Try again in a moment.'),
      color: 'error',
    })
  }
  finally {
    isSendingCode.value = false
  }
}

async function verifyAndRegister() {
  const pin = code.value.trim()
  if (!/^\d{6}$/.test(pin)) {
    toast.add({ title: 'Enter the 6-digit code', color: 'warning' })
    return
  }
  isVerifying.value = true
  try {
    await $fetch('/api/_auth/email-pin/verify', {
      method: 'POST',
      body: { email: trimmedEmail.value, pin },
    })
    track('Email pin verified')
    // Email is proven; the WebAuthn register handler will consume the
    // verification flag and bind the credential to the (new) user row.
    await registerPasskey({ userName: trimmedEmail.value })
    await fetchUserSession()
    track('Register with passkey')
    await postLoginNavigate()
  }
  catch (error: any) {
    console.error(error)
    track('Passkey register failed')
    toast.add({
      title: 'Could not finish signup',
      description: fetchErrorMessage(error, 'Try again or use Google.'),
      color: 'error',
    })
  }
  finally {
    isVerifying.value = false
  }
}

function changeEmail() {
  step.value = 'email'
  code.value = ''
}

function startOAuth(provider: 'google') {
  track(`Sign in with ${provider}`)
  activeProvider.value = provider
  // Full-page redirect so Google brings the user back to the same window;
  // the popup flow leaves the opener stuck on /login.
  window.location.href = `/auth/${provider}`
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
      <!-- Login: single-button passkey -->
      <form
        v-if="props.mode === 'login'"
        class="grid gap-4"
        @submit.prevent="handleLogin"
      >
        <UButton
          type="submit"
          block
          size="lg"
          color="primary"
          icon="i-lucide-key-round"
          :loading="isPasskeyLoading"
        >
          Sign in with passkey
        </UButton>
      </form>

      <!-- Register step 1: collect email, send PIN -->
      <form
        v-else-if="step === 'email'"
        class="grid gap-4"
        @submit.prevent="sendCode"
      >
        <UFormField label="Email" name="email">
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
          icon="i-lucide-mail"
          :loading="isSendingCode"
        >
          Send verification code
        </UButton>
      </form>

      <!-- Register step 2: enter PIN, verify, then register passkey -->
      <form
        v-else
        class="grid gap-4"
        @submit.prevent="verifyAndRegister"
      >
        <div class="text-sm text-gray-600">
          We sent a 6-digit code to
          <span class="font-mono">{{ trimmedEmail }}</span>.
          <button
            type="button"
            class="text-primary-600 hover:underline ml-1"
            @click="changeEmail"
          >
            Change
          </button>
        </div>

        <UFormField label="Verification code" name="code">
          <UInput
            v-model="code"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            placeholder="123456"
            maxlength="6"
            size="lg"
            class="w-full font-mono tracking-widest"
            required
          />
        </UFormField>

        <UButton
          type="submit"
          block
          size="lg"
          color="primary"
          icon="i-lucide-key-round"
          :loading="isVerifying"
        >
          Verify and create passkey
        </UButton>

        <button
          type="button"
          class="text-xs text-center text-gray-500 hover:text-gray-700"
          :disabled="isSendingCode"
          @click="sendCode"
        >
          {{ isSendingCode ? 'Resending…' : 'Resend code' }}
        </button>
      </form>

      <UiDivider text="or continue with" />

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

      <p class="text-xs text-center text-gray-400 font-mono">
        Passwordless by design
      </p>
    </UiCard>

    <p class="mt-6 text-center text-sm text-gray-500">
      {{ props.mode === 'login' ? "Don't have an account?" : 'Already have an account?' }}
      <NuxtLink
        :to="props.mode === 'login' ? '/register' : '/login'"
        class="text-primary-600 hover:underline font-medium"
        @click="track(props.mode === 'login' ? 'Switch to register' : 'Switch to login')"
      >
        {{ props.mode === 'login' ? 'Create one' : 'Sign in' }}
      </NuxtLink>
    </p>
  </section>
</template>
