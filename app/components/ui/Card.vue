<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'default' | 'interactive' | 'solid'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}>(), {
  variant: 'default',
  padding: 'md',
})

const variantClasses = {
  default: 'rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm',
  interactive: 'rounded-lg bg-white hover:bg-gray-50 transition-colors',
  solid: 'rounded-2xl bg-white border border-gray-200',
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
}
</script>

<template>
  <div :class="[variantClasses[variant], paddingClasses[padding]]">
    <slot />
  </div>
</template>
