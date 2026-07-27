<script setup lang="ts">
type TagListItem =
  | string
  | {
      slug: string
      count?: number
    }

const props = withDefaults(
  defineProps<{
    tags: TagListItem[]
    collapsible?: boolean
    justify?: 'start' | 'center'
    showAllLink?: boolean
  }>(),
  {
    collapsible: false,
    justify: 'start',
    showAllLink: false,
  },
)

const emit = defineEmits<{
  select: [tag: string]
  viewAll: []
}>()

const tagList = useTemplateRef<HTMLElement>('tagList')
const collapseToggle = useTemplateRef<HTMLElement>('collapseToggle')
const tagListId = useId()
const expanded = ref(false)
const hasMoreTags = ref(false)
const measuring = ref(true)
const collapsedItemCount = ref(Number.POSITIVE_INFINITY)
let resizeObserver: ResizeObserver | undefined
let observedWidth = 0
let measurementRun = 0

const normalizedTags = computed(() =>
  props.tags.map((tag) => (typeof tag === 'string' ? { slug: tag } : tag)),
)

const hiddenCount = computed(() => {
  const total = normalizedTags.value.length + (props.showAllLink ? 1 : 0)
  return Number.isFinite(collapsedItemCount.value) ? total - collapsedItemCount.value : 0
})

const toggleLabel = computed(() => {
  if (expanded.value) return 'Show fewer tags'
  return `Show ${hiddenCount.value} more ${hiddenCount.value === 1 ? 'tag' : 'tags'}`
})

async function fitToggleInSecondRow(run: number) {
  await nextTick()

  while (
    run === measurementRun &&
    hasMoreTags.value &&
    !expanded.value &&
    collapseToggle.value &&
    tagList.value &&
    collapsedItemCount.value > 0
  ) {
    const visibleChildren = Array.from(tagList.value.children).filter(
      (child) => (child as HTMLElement).offsetParent !== null,
    ) as HTMLElement[]
    const rowOffsets = [...new Set(visibleChildren.map((child) => child.offsetTop))]
    const toggleRow = rowOffsets.indexOf(collapseToggle.value.offsetTop)

    if (toggleRow < 2) return

    collapsedItemCount.value -= 1
    await nextTick()
  }
}

async function updateOverflow() {
  const run = ++measurementRun

  if (!tagList.value || !props.collapsible) {
    hasMoreTags.value = false
    measuring.value = false
    collapsedItemCount.value = Number.POSITIVE_INFINITY
    return
  }

  // Temporarily show every tag inside the clipped container so wrapping can
  // be measured without causing a visible layout jump.
  measuring.value = true
  await nextTick()
  if (run !== measurementRun || !tagList.value) return

  const children = Array.from(tagList.value.querySelectorAll<HTMLElement>('[data-tag-item]'))
  const rowOffsets = [...new Set(children.map((child) => child.offsetTop))]
  const firstHiddenRow = rowOffsets[2]

  hasMoreTags.value = firstHiddenRow !== undefined
  collapsedItemCount.value =
    firstHiddenRow === undefined
      ? children.length
      : children.findIndex((child) => child.offsetTop === firstHiddenRow)
  measuring.value = false

  if (!hasMoreTags.value) {
    expanded.value = false
    return
  }

  await fitToggleInSecondRow(run)
}

function toggleExpanded() {
  expanded.value = !expanded.value
  if (!expanded.value) {
    void updateOverflow()
  }
}

function selectTag(tag: string) {
  emit('select', tag)
}

function viewAllTags() {
  emit('viewAll')
}

watch(
  () => props.tags,
  async () => {
    expanded.value = false
    collapsedItemCount.value = Number.POSITIVE_INFINITY
    await nextTick()
    await updateOverflow()
  },
)

watch(
  () => props.collapsible,
  async () => {
    expanded.value = false
    await nextTick()
    await updateOverflow()
  },
)

onMounted(async () => {
  if (tagList.value) {
    observedWidth = tagList.value.clientWidth
  }

  if (typeof ResizeObserver !== 'undefined' && tagList.value) {
    resizeObserver = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width
      if (width === undefined || width === observedWidth) return

      observedWidth = width
      void updateOverflow()
    })
    resizeObserver.observe(tagList.value)
  }

  await nextTick()
  await updateOverflow()

  if (document.fonts) {
    void document.fonts.ready.then(() => updateOverflow())
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <div class="flex w-full flex-col" :class="justify === 'center' ? 'items-center' : 'items-start'">
    <div
      ref="tagList"
      class="flex w-full flex-wrap gap-2"
      :class="[
        justify === 'center' ? 'justify-center' : 'justify-start',
        collapsible && !expanded && 'max-h-[3.25rem] overflow-hidden',
      ]"
      :id="tagListId"
    >
      <NuxtLink
        v-for="(tag, index) in normalizedTags"
        v-show="expanded || measuring || index < collapsedItemCount"
        :key="tag.slug"
        class="inline-flex whitespace-nowrap rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        data-tag-item
        :to="`/tag/${tag.slug}`"
        @click="() => selectTag(tag.slug)"
      >
        <UiTag size="sm">
          {{ tag.slug }}
          <span v-if="tag.count !== undefined" class="ml-1 opacity-70 tabular-nums">
            ({{ tag.count }})
          </span>
        </UiTag>
      </NuxtLink>
      <NuxtLink
        v-if="showAllLink"
        v-show="expanded || measuring || normalizedTags.length < collapsedItemCount"
        class="inline-flex whitespace-nowrap rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        data-tag-item
        to="/tags"
        @click="viewAllTags"
      >
        <UiTag size="sm">
          all topics →
        </UiTag>
      </NuxtLink>
      <button
        v-if="hasMoreTags && !measuring"
        ref="collapseToggle"
        class="inline-flex cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        type="button"
        :aria-controls="tagListId"
        :aria-expanded="expanded"
        :aria-label="toggleLabel"
        @click="toggleExpanded"
      >
        <UiTag
          class="gap-1 hover:bg-white hover:border-gray-300"
          size="sm"
          variant="outline"
          :interactive="false"
        >
          {{ expanded ? 'show less' : `+${hiddenCount} more` }}
          <UIcon
            class="size-3 transition-transform duration-200"
            name="lucide:chevron-down"
            :class="expanded && 'rotate-180'"
          />
        </UiTag>
      </button>
    </div>
  </div>
</template>
