<script setup lang="ts">
const props = withDefaults(defineProps<{
  sortOptions: { label: string, value: string }[]
  placeholder?: string
  debounce?: number
}>(), {
  placeholder: 'Search issues...',
  debounce: 300,
})

const search = defineModel<string>('search', { default: '' })
const sort = defineModel<string>('sort', { required: true })

let searchTimeout: ReturnType<typeof setTimeout>
function onSearchInput(val: string | number) {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    search.value = String(val)
  }, props.debounce)
}
</script>

<template>
  <div class="flex items-stretch flex-1 rounded-md overflow-hidden border border-gray-200 [&_[data-slot=base]]:rounded-none">
    <UInput
      :model-value="search"
      :placeholder="placeholder"
      icon="i-lucide-search"
      size="md"
      variant="none"
      class="flex-1"
      @update:model-value="onSearchInput"
    />
    <USelectMenu
      v-model="sort"
      :items="sortOptions"
      value-key="value"
      size="md"
      variant="none"
      class="w-44 border-l border-gray-200"
    />
  </div>
</template>
