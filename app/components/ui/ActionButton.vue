<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    icon?: string
    to?: string
    type?: 'button' | 'submit'
  }>(),
  {
    icon: 'i-lucide-plus',
    type: 'button',
  },
)

const base = [
  'group inline-flex items-center justify-center gap-2 whitespace-nowrap',
  'rounded-lg px-4 py-2',
  'bg-primary-500 text-white text-sm font-semibold tracking-tight',
  'shadow-md shadow-primary-500/25 ring-1 ring-inset ring-white/15',
  'hover:bg-primary-600 hover:shadow-lg hover:shadow-primary-500/35 hover:-translate-y-px',
  'active:translate-y-0 active:shadow-sm',
  'transition-[transform,box-shadow,background-color] duration-200 ease-out',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500',
].join(' ')
</script>

<template>
  <NuxtLink v-if="to" v-bind="$attrs" :class="base" :to="to">
    <UIcon
      class="size-4 -ml-0.5 transition-transform duration-300 ease-out group-hover:rotate-90"
      :name="icon"
    />
    <span>
      <slot />
    </span>
  </NuxtLink>
  <button v-else v-bind="$attrs" :class="base" :type="type">
    <UIcon
      class="size-4 -ml-0.5 transition-transform duration-300 ease-out group-hover:rotate-90"
      :name="icon"
    />
    <span>
      <slot />
    </span>
  </button>
</template>
