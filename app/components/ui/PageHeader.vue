<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  description?: string
  center?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}>(), {
  center: false,
  size: 'lg',
})
</script>

<template>
  <header :class="['mb-8', center && 'text-center']">
    <UiPageTitle :size="size" :center="center">
      {{ title }}
    </UiPageTitle>
    <p v-if="description" class="mt-3 text-gray-600">
      {{ description }}
    </p>
    <slot />
  </header>
</template>
