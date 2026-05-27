<script setup lang="ts">
// Modal that captures a rejection reason with optional canned presets.
// Used by the Overview queue, the Issues admin page, and the audit log
// inline actions — every place that used to call window.prompt().
const props = defineProps<{
  open: boolean
  // Free-text label shown above the textarea (e.g. "Issue #42 — Title").
  target?: string
  // Optional override for the heading.
  title?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  // The parent owns the submit — emits success/error toasts itself.
  submit: [reason: string]
}>()

const presets = [
  { label: 'Spam / gibberish',           value: 'Spam or gibberish content.' },
  { label: 'Duplicate of existing item', value: 'Duplicate of an existing issue or solution. Please contribute on the original.' },
  { label: 'Off-topic',                  value: 'This submission is off-topic for the platform.' },
  { label: 'Low effort / unclear',       value: 'Submission lacks the detail needed to evaluate or act on it. Please expand and resubmit.' },
  { label: 'Personal info / PII',        value: 'Contains personal information about identifiable individuals. Please remove and resubmit.' },
  { label: 'Hate / harassment',          value: 'Contains hateful or harassing content.' },
]

const reason = ref('')
const submitting = ref(false)

watch(() => props.open, (v) => {
  if (v) reason.value = ''
})

function close() {
  if (submitting.value) return
  emit('update:open', false)
}

async function submit() {
  const trimmed = reason.value.trim()
  if (trimmed.length < 5 || submitting.value) return
  submitting.value = true
  try {
    emit('submit', trimmed)
  }
  finally {
    // Parent closes the modal once its action settles; we just unlock.
    submitting.value = false
  }
}
</script>

<template>
  <UModal :open="open" @update:open="emit('update:open', $event)">
    <template #content>
      <div class="p-4 space-y-3">
        <div>
          <h3 class="font-medium">{{ title || 'Reject submission' }}</h3>
          <p v-if="target" class="text-xs text-toned mt-0.5">{{ target }}</p>
        </div>

        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="p in presets"
            :key="p.label"
            type="button"
            class="text-[11px] rounded-full border border-gray-200 px-2.5 py-1 hover:bg-gray-50 transition-colors"
            @click="reason = p.value"
          >
            {{ p.label }}
          </button>
        </div>

        <UTextarea
          v-model="reason"
          placeholder="Explain why this is being rejected. The author will see this."
          :rows="4"
          autofocus
        />
        <p class="text-[11px] text-toned">Minimum 5 characters. Shown to the author.</p>

        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" :disabled="submitting" @click="close">Cancel</UButton>
          <UButton
            color="error"
            :loading="submitting"
            :disabled="reason.trim().length < 5"
            @click="submit"
          >
            Reject
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
