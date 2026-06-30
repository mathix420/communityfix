<script setup lang="ts">
defineProps<{
  value: string | null | undefined
  inline?: boolean
}>()
</script>

<template>
  <MDC
    v-if="value"
    class="prose max-w-none prose-a:text-primary-700 hover:prose-a:underline prose-headings:font-sans prose-headings:text-[1em] prose-headings:font-normal prose-headings:text-inherit prose-h1:text-[1em] prose-h2:text-[1em] prose-h3:text-[1em] prose-h4:text-[1em] prose-h5:text-[1em] prose-h6:text-[1em] prose-h1:font-normal prose-h2:font-normal prose-h3:font-normal prose-h4:font-normal prose-h5:font-normal prose-h6:font-normal prose-headings:mt-3 prose-headings:mb-0.5 prose-headings:before:content-['#'] prose-headings:before:mr-2 prose-headings:before:text-gray-400 prose-headings:before:font-normal [&_h1:hover]:before:text-primary-700 [&_h2:hover]:before:text-primary-700 [&_h3:hover]:before:text-primary-700 [&_h4:hover]:before:text-primary-700 [&_h5:hover]:before:text-primary-700 [&_h6:hover]:before:text-primary-700 prose-headings:prose-a:text-inherit prose-headings:prose-a:no-underline hover:prose-headings:prose-a:no-underline [&_h2_span]:hidden [&_h3_span]:hidden"
    :unwrap="inline ? 'p' : false"
    :value="value"
  />
</template>
