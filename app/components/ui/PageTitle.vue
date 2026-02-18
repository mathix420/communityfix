<script setup lang="ts">
withDefaults(defineProps<{
  as?: 'h1' | 'h2' | 'h3'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  center?: boolean
}>(), {
  as: 'h1',
  size: 'lg',
  center: false,
})

const sizeClasses = {
  sm: 'text-xl sm:text-2xl',
  md: 'text-2xl sm:text-3xl',
  lg: 'text-3xl sm:text-4xl',
  xl: 'text-4xl sm:text-5xl',
}
</script>

<template>
  <component
    :is="as"
    :class="[
      'font-mono font-medium underline decoration-primary decoration-2',
      sizeClasses[size],
      center && 'text-center',
    ]"
  >
    <slot />
  </component>
</template>
