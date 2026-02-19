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
  }
  else {
    modelValue.value = modelValue.value.filter(v => v !== id)
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
      type="button"
      :title="sdg.name"
      class="transition-all duration-150 focus:outline-none"
      :class="isSelected(sdg.id)
        ? ''
        : 'opacity-40 hover:opacity-70'
      "
      @click="toggle(sdg.id)"
    >
      <img
        :src="sdg.iconUrl"
        :alt="sdg.name"
        class="size-20"
      >
    </button>
  </div>
</template>
