<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'neutral' | 'outline'
  size?: 'sm' | 'md'
  rounded?: 'md' | 'full'
  interactive?: boolean
}>(), {
  variant: 'primary',
  size: 'md',
  rounded: 'full',
  interactive: true,
})

const variantClasses = {
  primary: 'bg-primary-50 text-primary-600 border border-primary-200',
  neutral: 'bg-gray-100 text-gray-600 border border-gray-200',
  outline: 'border border-gray-200 text-gray-600',
}

const hoverClasses = {
  primary: 'hover:bg-primary-100',
  neutral: 'hover:bg-gray-200',
  outline: 'hover:bg-gray-50',
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
      'inline-flex items-center font-normal font-mono transition-colors',
      variantClasses[variant],
      interactive && hoverClasses[variant],
      sizeClasses[size],
      roundedClasses[rounded],
    ]"
  >
    <slot />
  </span>
</template>
