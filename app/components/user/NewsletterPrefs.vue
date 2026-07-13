<script setup lang="ts">
// Newsletter opt-in and preferences. Collection side only: nothing is sent
// yet, we just record consent. Shared between the onboarding flow (parent
// calls the exposed save() on finish) and the settings page (showSave renders
// a save button with a toast).
const props = withDefaults(defineProps<{ showSave?: boolean }>(), { showSave: false })

const { track } = useUmami()
const toast = useToast()

type Prefs = {
  enabled: boolean
  frequency: 'weekly' | 'monthly'
  content: {
    goodNews: boolean
    skillMatches: boolean
    topicMatches: boolean
    helpWanted: boolean
    productUpdates: boolean
  }
}

const enabled = ref(false)
const frequency = ref<'weekly' | 'monthly'>('monthly')
const content = reactive<Prefs['content']>({
  goodNews: false,
  skillMatches: false,
  topicMatches: false,
  helpWanted: false,
  productUpdates: false,
})

const { data: prefs } = await useFetch<Prefs>('/api/me/newsletter')
watchEffect(() => {
  if (!prefs.value) return
  enabled.value = prefs.value.enabled
  frequency.value = prefs.value.frequency
  Object.assign(content, prefs.value.content)
})

// Sensible defaults the first time the toggle goes on: monthly, good news
// and interest matches. Only when nothing is picked yet, so re-enabling
// keeps whatever the user chose before.
watch(enabled, (on) => {
  if (on && !Object.values(content).some(Boolean)) {
    frequency.value = 'monthly'
    content.goodNews = true
    content.topicMatches = true
  }
})

const frequencyItems = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
]

const contentItems: Array<{ key: keyof Prefs['content']; label: string }> = [
  { key: 'goodNews', label: 'Good news only (successful case studies)' },
  { key: 'skillMatches', label: 'Issues matching my skills' },
  { key: 'topicMatches', label: 'New in my interests' },
  { key: 'helpWanted', label: 'Help wanted digest' },
  { key: 'productUpdates', label: 'Product updates' },
]

const saving = ref(false)

async function save(): Promise<boolean> {
  saving.value = true
  try {
    await $fetch('/api/me/newsletter', {
      method: 'PUT',
      body: { enabled: enabled.value, frequency: frequency.value, content: { ...content } },
    })
    track('Newsletter preferences saved', { enabled: enabled.value, frequency: frequency.value })
    return true
  } catch (error) {
    const e = error as { data?: { statusMessage?: string } }
    toast.add({
      title: 'Could not save newsletter preferences',
      description: e?.data?.statusMessage || 'Please try again.',
      color: 'error',
    })
    return false
  } finally {
    saving.value = false
  }
}

async function saveWithToast() {
  if (await save()) {
    toast.add({ title: 'Newsletter preferences saved', color: 'success' })
  }
}

defineExpose({ save, enabled })
</script>

<template>
  <div class="flex flex-col gap-5">
    <USwitch
      v-model="enabled"
      description="Occasional email with things worth your attention. Unsubscribe anytime."
      label="Send me the newsletter"
      size="lg"
    />
    <template v-if="enabled">
      <UFormField label="Frequency" name="frequency">
        <URadioGroup v-model="frequency" orientation="horizontal" :items="frequencyItems" />
      </UFormField>
      <UFormField label="What to include" name="content">
        <div class="flex flex-col gap-2.5 mt-1">
          <UCheckbox
            v-for="item in contentItems"
            :key="item.key"
            v-model="content[item.key]"
            :label="item.label"
          />
        </div>
      </UFormField>
    </template>
    <UButton
      v-if="props.showSave"
      block
      color="primary"
      size="lg"
      :loading="saving"
      @click="saveWithToast"
    >
      Save newsletter preferences
    </UButton>
  </div>
</template>
