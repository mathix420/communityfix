<script setup lang="ts">
// Centered "nothing here yet" placeholder. Pair with a clear CTA so the
// reader has a single next-step instead of a dead-end page.
withDefaults(defineProps<{
  icon?: string
  title: string
  description?: string
  ctaLabel?: string
  ctaTo?: string
  ctaEvent?: string
  // Tighter spacing for inline use (e.g. inside a card section instead of
  // taking up a full tab body).
  compact?: boolean
}>(), {
  icon: 'lucide:sparkles',
  compact: false,
})

const { track } = useUmami()
</script>

<template>
  <div
    class="flex flex-col items-center text-center gap-3"
    :class="compact ? 'py-8 px-4' : 'py-14 px-6'"
  >
    <div
      class="inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-400"
      :class="compact ? 'size-10' : 'size-14'"
    >
      <UIcon :name="icon" :class="compact ? 'size-5' : 'size-6'" />
    </div>
    <div class="flex flex-col gap-1 max-w-md">
      <p class="font-title text-gray-900" :class="compact ? 'text-base' : 'text-lg'">
        {{ title }}
      </p>
      <p v-if="description" class="text-sm text-gray-500 leading-relaxed">
        {{ description }}
      </p>
    </div>
    <UiActionButton
      v-if="ctaLabel && ctaTo"
      :to="ctaTo"
      class="mt-1"
      @click="ctaEvent && track(ctaEvent)"
    >
      {{ ctaLabel }}
    </UiActionButton>
  </div>
</template>
