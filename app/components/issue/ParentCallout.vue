<script setup lang="ts">
const props = defineProps<{
  parent?: {
    id: number
    title: string
  }
  parents?: {
    id: number
    title: string
  }[]
  label?: string
}>()

const links = computed(() => props.parents ?? (props.parent ? [props.parent] : []))
const singleLink = computed(() => (links.value.length === 1 ? links.value[0] : undefined))
</script>

<template>
  <NuxtLink
    v-if="singleLink"
    class="group flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-primary hover:bg-primary-50 sm:p-6"
    :to="`/issue/${singleLink.id}`"
  >
    <UIcon
      class="size-4 shrink-0 text-gray-400 group-hover:text-primary"
      name="lucide:corner-left-up"
    />
    <div class="min-w-0">
      <p class="text-xs font-mono uppercase tracking-wide text-gray-400 group-hover:text-primary">
        {{ label || 'Parent issue' }}
      </p>
      <p class="truncate text-sm font-medium text-gray-700 group-hover:text-primary-700">
        <span class="text-gray-400 font-light font-mono mr-1">
          {{ formatNumber(singleLink.id) }}
        </span>
        {{ singleLink.title }}
      </p>
    </div>
  </NuxtLink>
  <div
    v-else-if="links.length"
    class="group flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 transition-colors has-[a:hover]:border-primary has-[a:hover]:bg-primary-50 sm:p-6"
  >
    <UIcon
      class="mt-0.5 size-4 shrink-0 text-gray-400 group-has-[a:hover]:text-primary"
      name="lucide:corner-left-up"
    />
    <div class="min-w-0 flex-1">
      <p class="text-xs font-mono uppercase tracking-wide text-gray-400 group-has-[a:hover]:text-primary">
        {{ label || 'Parent issue' }}
      </p>
      <div class="flex flex-col items-start gap-0.5">
        <NuxtLink
          v-for="link in links"
          :key="link.id"
          class="group/link block max-w-full truncate text-sm font-medium text-gray-700 hover:text-primary-700"
          :to="`/issue/${link.id}`"
        >
          <span class="mr-1 font-mono font-light text-gray-400 group-hover/link:text-primary">
            {{ formatNumber(link.id) }}
          </span>
          {{ link.title }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
