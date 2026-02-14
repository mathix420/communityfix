<script setup lang="ts">
withDefaults(defineProps<{
  as?: 'h2' | 'h3' | 'h4'
}>(), {
  as: 'h2',
})
</script>

<template>
  <component
    :is="as"
    class="font-mono text-xl font-medium"
  >
    <slot />
  </component>
</template>
