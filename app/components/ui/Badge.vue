<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error'
}>(), {
  variant: 'default',
})

const variantClasses = {
  default: 'bg-gray-100 text-gray-600',
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-mono',
      variantClasses[variant],
    ]"
  >
    <slot />
  </span>
</template>
