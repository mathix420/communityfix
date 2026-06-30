<script setup lang="ts">
definePageMeta({ middleware: ['admin'] })

const tabs = [
  { name: 'Overview', path: '/admin' },
  { name: 'Issues', path: '/admin/issues' },
  { name: 'Users', path: '/admin/users' },
  { name: 'Audit Logs', path: '/admin/logs' },
]

const autoModOpen = ref(false)
const autoModKind = ref<'issue' | 'solution' | 'case-study'>('issue')
const autoModId = ref<number | null>(null)
const autoModError = ref('')
const autoModLoading = ref(false)
const autoModKindOptions = [
  { label: 'Issue', value: 'issue' },
  { label: 'Solution', value: 'solution' },
  { label: 'Case study', value: 'case-study' },
]

async function runAutoMod() {
  if (!autoModId.value) {
    autoModError.value = 'Enter an ID'
    return
  }
  autoModError.value = ''
  autoModLoading.value = true
  try {
    const path =
      autoModKind.value === 'case-study'
        ? `/api/admin/case-study/${autoModId.value}/remod`
        : `/api/admin/issues/${autoModId.value}/remod`
    await $fetch(path, { method: 'POST' as const })
    autoModOpen.value = false
    autoModId.value = null
    await refreshNuxtData()
  } catch (err: unknown) {
    autoModError.value =
      (err as { data?: { message?: string }; message?: string })?.data?.message ??
      (err as { message?: string })?.message ??
      'Failed to run auto-mod'
  } finally {
    autoModLoading.value = false
  }
}
</script>

<template>
  <div class="max-w-5xl mx-auto overflow-x-clip h-fit w-full mb-auto pt-20 px-4 pb-4">
    <UiPageHeader description="Automated decisions, appeals, and moderation." title="Admin" />
    <div class="flex items-center justify-between gap-3 mb-6 flex-wrap">
      <UiNavTabs class="!mb-0" :tabs="tabs" />
      <UButton
        color="primary"
        icon="lucide:sparkles"
        size="sm"
        variant="soft"
        @click="() => {
          autoModOpen = true
        }"
      >
        Run auto-mod
      </UButton>
    </div>
    <NuxtPage />
    <UModal v-model:open="autoModOpen">
      <template #content>
        <div class="p-4 space-y-3">
          <h3 class="font-medium">
            Run auto-mod
          </h3>
          <p class="text-sm text-toned">
            Resets the target to
            <span class="font-mono">
              pending
            </span>
            and re-runs the AI moderation pipeline.
          </p>
          <div class="flex gap-2">
            <USelectMenu
              v-model="autoModKind"
              class="w-40"
              value-key="value"
              :items="autoModKindOptions"
            />
            <UInput
              v-model.number="autoModId"
              autofocus
              class="flex-1"
              placeholder="Target ID"
              type="number"
              @keyup.enter="runAutoMod"
            />
          </div>
          <p v-if="autoModError" class="text-xs text-red-600">
            {{ autoModError }}
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="() => {
                autoModOpen = false
              }"
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              :disabled="!autoModId"
              :loading="autoModLoading"
              @click="runAutoMod"
            >
              Run pipeline
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
