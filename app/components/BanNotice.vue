<script setup lang="ts">
defineProps<{
  banStatus: {
    banned: boolean
    reason?: string | null
    bannedUntil?: string | null
    appealStatus?: string | null
  }
}>()

const emit = defineEmits<{
  appealed: []
}>()

const toast = useToast()
const submitting = ref(false)

async function submitAppeal() {
  submitting.value = true
  try {
    await $fetch('/api/user/ban-appeal', { method: 'POST' })
    umami.track('Ban appeal submitted')
    toast.add({ title: 'Appeal submitted', description: 'Your appeal is under review.', color: 'success' })
    emit('appealed')
  }
  catch (error: any) {
    toast.add({
      title: 'Failed to submit appeal',
      description: error?.data?.message || error?.message || 'Please try again.',
      color: 'error',
    })
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="bg-red-50 rounded-lg px-4 py-4 space-y-3">
    <p class="text-red-700 text-sm font-semibold">
      Your account is temporarily banned.
    </p>
    <p class="text-red-600 text-sm">
      {{ banStatus.reason }}
    </p>
    <p class="text-gray-600 text-sm">
      Ban expires: {{ new Date(banStatus.bannedUntil!).toLocaleDateString() }}
    </p>
    <div v-if="banStatus.appealStatus === 'pending'">
      <p class="text-yellow-700 text-sm font-mono">
        Your appeal is under review.
      </p>
    </div>
    <div v-else-if="banStatus.appealStatus === 'denied'">
      <p class="text-red-700 text-sm font-mono">
        Your appeal was denied.
      </p>
    </div>
    <div v-else-if="!banStatus.appealStatus">
      <UButton
        color="primary"
        size="sm"
        :loading="submitting"
        data-umami-event="Appeal ban"
        @click="submitAppeal"
      >
        Appeal this ban
      </UButton>
    </div>
  </div>
</template>
