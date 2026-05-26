<script setup lang="ts">
import { slaTier, slaBorderClass } from '~/utils/admin-sla'

// Generic queue row. Owns: SLA-tinted left border, header line, the
// expand-for-detail toggle, and the action button slot. Inline preview
// content is opt-in via the #preview slot — most cards want it.
const props = defineProps<{
  since: string | Date | null | undefined
  // Initial collapsed/expanded state. Caller can also v-model it.
  expanded?: boolean
}>()

const localExpanded = ref(props.expanded ?? false)
watch(() => props.expanded, (v) => { if (v != null) localExpanded.value = v })

const tier = computed(() => slaTier(props.since))
</script>

<template>
  <UiCard padding="sm" :class="slaBorderClass(tier)">
    <div class="space-y-2">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1 space-y-1">
          <slot name="header" />
        </div>
        <div class="flex flex-col gap-1.5 shrink-0">
          <slot name="actions" />
        </div>
      </div>

      <slot name="meta" />

      <button
        v-if="$slots.preview"
        type="button"
        class="text-[11px] text-toned hover:text-black inline-flex items-center gap-1 transition-colors"
        @click="localExpanded = !localExpanded"
      >
        <UIcon
          name="lucide:chevron-right"
          class="size-3 transition-transform"
          :class="{ 'rotate-90': localExpanded }"
        />
        {{ localExpanded ? 'Hide details' : 'Show details' }}
      </button>

      <div v-if="localExpanded && $slots.preview" class="bg-gray-50/80 rounded-lg p-3 text-xs space-y-2">
        <slot name="preview" />
      </div>
    </div>
  </UiCard>
</template>
