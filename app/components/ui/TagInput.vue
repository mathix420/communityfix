<script setup lang="ts">
const props = withDefaults(defineProps<{
  suggestions?: string[]
  placeholder?: string
}>(), {
  suggestions: () => [],
  placeholder: 'Add a tag...',
})

const modelValue = defineModel<string[]>({ default: () => [] })

const input = ref('')
const inputEl = ref<HTMLInputElement>()
const focused = ref(false)
const highlightedIndex = ref(-1)

const filteredSuggestions = computed(() => {
  const q = input.value.toLowerCase().trim()
  return props.suggestions.filter(s =>
    !modelValue.value.some(t => t.toLowerCase() === s.toLowerCase())
    && (!q || s.toLowerCase().includes(q)),
  )
})

const showDropdown = computed(() => focused.value && filteredSuggestions.value.length > 0)

function addTag(raw: string) {
  const tag = raw.trim()
  if (!tag) return
  if (modelValue.value.some(t => t.toLowerCase() === tag.toLowerCase())) return
  modelValue.value = [...modelValue.value, tag]
  input.value = ''
  highlightedIndex.value = -1
}

function removeTag(index: number) {
  modelValue.value = modelValue.value.filter((_, i) => i !== index)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    if (highlightedIndex.value >= 0 && highlightedIndex.value < filteredSuggestions.value.length) {
      addTag(filteredSuggestions.value[highlightedIndex.value]!)
    } else {
      addTag(input.value)
    }
  } else if (e.key === 'Backspace' && input.value === '' && modelValue.value.length) {
    removeTag(modelValue.value.length - 1)
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (showDropdown.value) {
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredSuggestions.value.length - 1)
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (showDropdown.value) {
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1)
    }
  } else if (e.key === 'Escape') {
    inputEl.value?.blur()
  }
}

function onFocus() {
  focused.value = true
}

function onBlur() {
  // Delay to allow click on suggestion to register
  setTimeout(() => {
    focused.value = false
    highlightedIndex.value = -1
  }, 150)
}

function selectSuggestion(s: string) {
  addTag(s)
  inputEl.value?.focus()
}

watch(input, () => {
  highlightedIndex.value = -1
})
</script>

<template>
  <div class="relative">
    <div
      class="flex flex-wrap items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 transition-colors dark:border-gray-700 dark:bg-gray-900"
      :class="focused ? 'ring-2 ring-primary-500 border-primary-500' : ''"
      @click="inputEl?.focus()"
    >
      <UiTag
        v-for="(tag, i) in modelValue"
        :key="tag"
        class="gap-1"
      >
        {{ tag }}
        <button
          type="button"
          class="inline-flex items-center rounded-full p-0.5 hover:bg-primary-100 dark:hover:bg-primary-900"
          @click.stop="removeTag(i)"
        >
          <UIcon name="lucide:x" class="size-3" />
        </button>
      </UiTag>
      <input
        ref="inputEl"
        v-model="input"
        type="text"
        :placeholder="modelValue.length ? '' : placeholder"
        class="min-w-[80px] flex-1 border-none bg-transparent py-0.5 text-sm outline-none placeholder:text-gray-400"
        @keydown="onKeydown"
        @focus="onFocus"
        @blur="onBlur"
      >
    </div>

    <div
      v-if="showDropdown"
      class="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
    >
      <button
        v-for="(s, i) in filteredSuggestions"
        :key="s"
        type="button"
        class="block w-full px-3 py-2 text-left text-sm transition-colors"
        :class="i === highlightedIndex
          ? 'bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400'
          : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'"
        @mousedown.prevent="selectSuggestion(s)"
      >
        {{ s }}
      </button>
    </div>
  </div>
</template>
