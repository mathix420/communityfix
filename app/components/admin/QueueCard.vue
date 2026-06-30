<script setup lang="ts">
// Generic queue row. Owns the header line, the expand-for-detail toggle,
// and the action button slot. Inline preview content is opt-in via the
// #preview slot — most cards want it. Urgency is communicated by the
// inline SlaBadge in the header, not by card chrome.
const props = defineProps<{
  since: string | Date | null | undefined
  // Initial collapsed/expanded state. Caller can also v-model it.
  expanded?: boolean
}>()
void props

const localExpanded = ref(props.expanded ?? false)
watch(
  () => props.expanded,
  (v) => {
    if (v != null) localExpanded.value = v
  },
)

const slots = useSlots()
const hasActions = computed(() => !!slots.actions)
const hasPreview = computed(() => !!slots.preview)
</script>

<template>
  <UiCard padding="md">
    <div class="space-y-3">
      <div class="min-w-0 space-y-1">
        <slot name="header" />
      </div>
      <slot name="meta" />
      <div v-if="localExpanded && hasPreview" class="bg-gray-50/80 rounded-lg p-3 text-xs space-y-2">
        <slot name="preview" />
      </div>
      <div
        v-if="hasActions || hasPreview"
        class="flex items-center justify-between gap-3 flex-wrap pt-1"
      >
        <div class="flex flex-wrap items-center gap-1.5">
          <slot name="actions" />
        </div>
        <button
          v-if="hasPreview"
          class="text-[11px] text-toned hover:text-black inline-flex items-center gap-1 transition-colors ml-auto"
          type="button"
          @click="localExpanded = !localExpanded"
        >
          <UIcon
            class="size-3 transition-transform"
            name="lucide:chevron-right"
            :class="{ 'rotate-90': localExpanded }"
          />
          {{ localExpanded ? 'Hide details' : 'Show details' }}
        </button>
      </div>
    </div>
  </UiCard>
</template>
