<script setup lang="ts">
const props = defineProps<{
  tabs: { name: string, path: string }[]
}>()

const route = useRoute()
const computedTabs = computed(() =>
  props.tabs.map(tab => ({
    ...tab,
    active: route.path === tab.path,
  })),
)

const tabsContainer = ref<HTMLElement | null>(null)
const highlightStyle = ref<Record<string, string>>({
  transform: `translate(0px, 0px)`,
})

function updateHighlight() {
  nextTick(() => {
    const container = tabsContainer.value
    const items = container?.querySelectorAll('.tab-item') || []
    const idx = props.tabs.findIndex(tab => route.path === tab.path)
    const el = items[idx] as HTMLElement | undefined
    if (el) {
      const { offsetLeft: left, offsetTop: top, offsetWidth: width, offsetHeight: height } = el
      highlightStyle.value = {
        width: width + 'px',
        height: height + 'px',
        transform: `translate(${left - 4}px, ${top - 4}px)`,
      }

      // Scroll the active tab into view with smooth behavior
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  })
}

onMounted(updateHighlight)
watch(() => route.path, updateHighlight)
</script>

<template>
  <div
    ref="tabsContainer"
    class="relative bg-black/10 rounded-lg p-1 flex w-fit max-w-full gap-1 text-sm overflow-x-scroll scrollbar-hide"
  >
    <!-- animated highlight -->
    <div
      class="absolute bg-white rounded-lg transition-all duration-300 pointer-events-none"
      :style="highlightStyle"
    />
    <!-- tabs -->
    <NuxtLink
      v-for="tab in computedTabs"
      :key="tab.name"
      :to="tab.path"
      class="tab-item select-none z-10 text-toned hover:text-black/80 transition-colors py-2 px-4 rounded-lg"
      :class="{ 'hover:bg-black/5': !tab.active }"
    >
      {{ tab.name }}
    </NuxtLink>
  </div>
</template>
