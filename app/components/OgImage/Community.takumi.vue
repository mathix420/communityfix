<script setup lang="ts">
// OG image for community nodes (issues, solutions, case studies, members,
// tags): wordmark top-left, kind + id top-right, big title + blue underline.
const props = withDefaults(defineProps<{
  title?: string
  kind?: string
  id?: number | string
}>(), {
  title: 'CommunityFix',
  kind: 'Issue',
  id: undefined,
})

// Pad numeric ids to the in-app "#00042" form; pass strings through.
const idLabel = computed(() => {
  if (props.id === undefined || props.id === null || props.id === '') return ''
  return typeof props.id === 'number' ? `#${String(props.id).padStart(5, '0')}` : `#${props.id}`
})
</script>

<template>
  <div style="display:flex;flex-direction:column;width:1200px;height:600px;background-color:#f9fafb;padding:56px;">
    <div style="display:flex;flex-direction:row;width:1088px;align-items:flex-start;justify-content:space-between;gap:32px;">
      <div style="display:flex;flex-direction:column;align-items:stretch;">
        <p style="display:block;margin:0;font-family:Oswald;font-size:34px;line-height:1;font-weight:400;color:#111827;">
          communityfix.org
        </p>
        <div style="height:5px;margin-top:7px;background-color:#3b82f6;" />
      </div>

      <div style="display:flex;flex-direction:column;align-items:flex-end;">
        <p style="display:block;margin:0;font-family:Oswald;font-size:26px;line-height:1;font-weight:500;letter-spacing:3px;text-transform:uppercase;color:#6b7280;">
          {{ kind }}
        </p>
        <p
          v-if="idLabel"
          style="display:block;margin:6px 0 0;font-family:Oswald;font-size:60px;line-height:1;font-weight:500;color:#cbd5e1;"
        >
          {{ idLabel }}
        </p>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;align-items:flex-start;width:1088px;margin-top:auto;">
      <h1 style="display:block;width:1088px;margin:0 0 26px;font-family:Oswald;font-size:84px;line-height:1.05;font-weight:500;color:#111827;line-clamp:3;text-overflow:ellipsis;">
        {{ title }}
      </h1>
      <div style="width:1088px;height:20px;background-color:#3b82f6;" />
    </div>
  </div>
</template>
