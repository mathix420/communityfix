<script setup lang="ts">
// Centered "nothing here yet" placeholder. Pair with a clear CTA so the
// reader has a single next-step instead of a dead-end page.
withDefaults(
  defineProps<{
    icon?: string
    title: string
    description?: string
    ctaLabel?: string
    ctaTo?: string
    ctaEvent?: string
    // Tighter spacing for inline use (e.g. inside a card section instead of
    // taking up a full tab body).
    compact?: boolean
  }>(),
  {
    icon: 'lucide:sparkles',
    compact: false,
  },
)

const { track } = useUmami()
</script>

<template>
  <div
    class="rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm text-center"
    :class="compact ? 'p-5' : 'px-6 py-7'"
  >
    <div class="flex flex-col items-center gap-3">
      <div
        class="inline-flex items-center justify-center rounded-xl bg-primary-50 text-primary-600"
        :class="compact ? 'size-9' : 'size-10'"
      >
        <UIcon class="size-5" :name="icon" />
      </div>
      <div class="flex flex-col gap-1 max-w-sm">
        <p class="font-title text-base text-gray-900">
          {{ title }}
        </p>
        <p v-if="description" class="text-sm text-gray-600 leading-snug">
          {{ description }}
        </p>
      </div>
      <UiActionButton v-if="ctaLabel && ctaTo" :to="ctaTo" @click="ctaEvent && track(ctaEvent)">
        {{ ctaLabel }}
      </UiActionButton>
    </div>
  </div>
</template>
