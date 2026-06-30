<script setup lang="ts">
import { slaTier, slaBadgeClass, ageHours } from '~/utils/admin-sla'

const props = defineProps<{
  since: string | Date | null | undefined
  // Suppresses the badge when the item is fresh (< 24h) — cleaner UI.
  hideWhenFresh?: boolean
}>()

const tier = computed(() => slaTier(props.since))
const hours = computed(() => ageHours(props.since))
const visible = computed(() => !(props.hideWhenFresh && tier.value === 'fresh'))

const label = computed(() => {
  if (hours.value == null) return ''
  if (hours.value < 24) return `${hours.value}h`
  const days = Math.floor(hours.value / 24)
  return `${days}d`
})
</script>

<template>
  <span
    v-if="visible"
    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium font-mono"
    :class="slaBadgeClass(tier)"
    :title="`Open ${label}`"
  >
    <UIcon class="size-3" name="lucide:clock" />
    {{ label }}
  </span>
</template>
