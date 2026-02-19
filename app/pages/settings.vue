<script setup lang="ts">
const { user, fetch: fetchUserSession, clear } = useUserSession()
const toast = useToast()
const saving = ref(false)

const name = ref(user.value?.name || '')

async function saveProfile() {
  saving.value = true
  try {
    await $fetch('/api/user/profile', {
      method: 'PUT',
      body: { name: name.value },
    })
    umami.track('Profile saved')
    await fetchUserSession()
    toast.add({ title: 'Profile updated', color: 'success' })
  }
  catch (error: any) {
    toast.add({
      title: 'Failed to save',
      description: error?.message || 'Please try again.',
      color: 'error',
    })
  }
  finally {
    saving.value = false
  }
}

async function logout() {
  umami.track('Log out')
  await clear()
  await navigateTo('/login')
}

useSeoMeta({
  title: 'Settings - CommunityFix',
  description: 'Manage your CommunityFix profile and account settings.',
})

definePageMeta({
  middleware: ['auth'],
})
</script>

<template>
  <AppContainer>
    <section class="w-full max-w-md mx-auto">
      <UiPageHeader
        title="Settings"
        description="Manage your profile and account."
        center
      />

      <UiCard
        padding="lg"
        class="flex flex-col gap-5"
      >
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
            label="Email"
            name="email"
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
            :loading="saving"
          >
            Save
          </UButton>
        </form>

        <UiDivider text="session" />

        <UButton
          block
          variant="soft"
          color="error"
          size="lg"
          @click="logout"
        >
          Log out
        </UButton>
      </UiCard>

      <NuxtLink
        :to="`/user/${user?.id}`"
        class="block text-center text-primary-600 hover:underline font-mono mt-4"
        data-umami-event="View own profile"
      >
        View profile
      </NuxtLink>
    </section>
  </AppContainer>
</template>
