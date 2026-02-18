<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'neutral' | 'outline'
  size?: 'sm' | 'md'
  rounded?: 'md' | 'full'
}>(), {
  variant: 'primary',
  size: 'md',
  rounded: 'full',
})

const variantClasses = {
  primary: 'bg-primary-50 text-primary-600 hover:bg-primary-100',
  neutral: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
  outline: 'border border-gray-200 text-gray-600 hover:bg-gray-50',
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
}

const roundedClasses = {
  md: 'rounded-md',
  full: 'rounded-full',
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center font-medium transition-colors',
      variantClasses[variant],
      sizeClasses[size],
      roundedClasses[rounded],
    ]"
  >
    <slot />
  </span>
</template>
