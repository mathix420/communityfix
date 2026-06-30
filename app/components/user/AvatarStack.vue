<script setup lang="ts">
// Overlapping avatar stack for a node card: owners lead (they steward the node),
// followed by collaborators (people whose suggestions landed). Both arrays arrive
// already ordered most-active-first. Caps the visible avatars and rolls the rest
// into a "+N" chip. Names + roles live in tooltips only — cards don't print them.
interface Person {
  id?: string | null
  name: string
  changes?: number
}

const props = withDefaults(
  defineProps<{
    owners?: Person[]
    collaborators?: Person[]
    max?: number
  }>(),
  {
    owners: () => [],
    collaborators: () => [],
    max: 5,
  },
)

const people = computed<Person[]>(() => [...props.owners, ...props.collaborators])
const shown = computed(() => people.value.slice(0, props.max))
const overflow = computed(() => Math.max(0, people.value.length - props.max))

function avatarUrl(p: Person) {
  return `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(p.id || p.name)}`
}

function isOwner(index: number) {
  return index < props.owners.length
}

function tooltip(p: Person, index: number) {
  const role = isOwner(index) ? 'owner' : 'collaborator'
  const n = p.changes ?? 0
  return n > 0 ? `${p.name} · ${role} · ${n} ${n === 1 ? 'edit' : 'edits'}` : `${p.name} · ${role}`
}
</script>

<template>
  <div class="flex items-center shrink-0">
    <component
      :is="p.id ? 'NuxtLink' : 'span'"
      v-for="(p, i) in shown"
      :key="p.id || p.name"
      class="relative -ml-2 first:ml-0 inline-flex rounded-full ring-2 ring-white bg-white transition-transform hover:-translate-y-0.5 hover:z-10"
      :style="{ zIndex: shown.length - i }"
      :title="tooltip(p, i)"
      :to="p.id ? `/user/${p.id}` : undefined"
    >
      <img class="size-6 rounded-full bg-gray-100" loading="lazy" :alt="p.name" :src="avatarUrl(p)">
    </component>
    <span
      v-if="overflow"
      class="relative -ml-2 inline-flex items-center justify-center size-6 rounded-full ring-2 ring-white bg-gray-100 text-[10px] font-mono text-gray-600"
      :title="`${overflow} more`"
    >
      +{{ overflow }}
    </span>
  </div>
</template>
