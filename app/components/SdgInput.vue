<script setup lang="ts">
interface Sdg {
  id: number
  name: string
  iconUrl: string
  link: string
}

const props = defineProps<{
  sdgs: Sdg[]
}>()

const modelValue = defineModel<number[]>({ default: () => [] })

function toggle(id: number) {
  const idx = modelValue.value.indexOf(id)
  if (idx === -1) {
    modelValue.value = [...modelValue.value, id]
  } else {
    modelValue.value = modelValue.value.filter((v) => v !== id)
  }
}

function isSelected(id: number) {
  return modelValue.value.includes(id)
}
</script>

<template>
  <div class="flex flex-wrap justify-center gap-3">
    <button
      v-for="sdg in props.sdgs"
      :key="sdg.id"
      class="transition-all duration-150 focus:outline-none"
      type="button"
      :class="isSelected(sdg.id) ? '' : 'opacity-40 hover:opacity-70'"
      :title="sdg.name"
      @click="toggle(sdg.id)"
    >
      <img class="size-20" :alt="sdg.name" :src="sdg.iconUrl">
    </button>
  </div>
</template>
