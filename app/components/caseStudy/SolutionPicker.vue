<script setup lang="ts">
interface SolutionRef {
  id: number
  title: string
}

const props = withDefaults(
  defineProps<{
    solutions?: SolutionRef[]
  }>(),
  { solutions: () => [] },
)

const model = defineModel<number[]>({ default: () => [] })
const selected = ref<SolutionRef[]>([])
const idInput = ref('')
const checking = ref(false)
const error = ref('')

watch(
  () => props.solutions,
  (rows) => {
    const known = new Map(selected.value.map((row) => [row.id, row]))
    for (const row of rows) known.set(row.id, row)
    selected.value = model.value.flatMap((id) => {
      const row = known.get(id)
      return row ? [row] : []
    })
  },
  { immediate: true, deep: true },
)

async function addSolution() {
  error.value = ''
  const id = Number(idInput.value)
  if (!Number.isInteger(id) || id <= 0) {
    error.value = 'Enter a numeric solution id.'
    return
  }
  if (model.value.includes(id)) {
    error.value = 'That solution is already linked.'
    return
  }
  checking.value = true
  try {
    const node = await $fetch(`/api/issue/${id}`)
    if (!node || node.type !== 'solution') {
      error.value = `#${id} is not a solution.`
      return
    }
    selected.value.push({ id: node.id, title: node.title })
    model.value = [...model.value, node.id].sort((a, b) => a - b)
    idInput.value = ''
  } catch {
    error.value = `Couldn't load solution #${id}.`
  } finally {
    checking.value = false
  }
}

function removeSolution(id: number) {
  if (model.value.length === 1) return
  model.value = model.value.filter((value) => value !== id)
  selected.value = selected.value.filter((row) => row.id !== id)
}
</script>

<template>
  <UFormField
    hint="Link every catalog solution that this deployment combined"
    label="Solutions implemented"
    name="solutionIds"
    required
  >
    <div class="space-y-2">
      <div v-if="selected.length" class="flex flex-wrap gap-2">
        <span
          v-for="solution in selected"
          :key="solution.id"
          class="inline-flex max-w-full items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-sm"
        >
          <NuxtLink class="truncate hover:underline" :to="`/issue/${solution.id}`">
            #{{ solution.id }} {{ solution.title }}
          </NuxtLink>
          <button
            class="text-gray-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
            type="button"
            :aria-label="`Remove ${solution.title}`"
            :disabled="model.length === 1"
            @click="removeSolution(solution.id)"
          >
            <UIcon class="size-3.5" name="lucide:x" />
          </button>
        </span>
      </div>
      <div class="flex items-center gap-2">
        <UInput
          v-model="idInput"
          class="w-36"
          placeholder="Solution id"
          size="sm"
          type="number"
          @keydown.enter.prevent="addSolution"
        />
        <UButton
          color="neutral"
          size="sm"
          variant="soft"
          :disabled="!idInput.trim()"
          :loading="checking"
          @click="addSolution"
        >
          Add solution
        </UButton>
      </div>
      <p v-if="error" class="text-xs text-red-600">
        {{ error }}
      </p>
    </div>
  </UFormField>
</template>
