<script setup lang="ts">
// OG image for first-party pages (guides, docs, legal): like Community but
// with a category eyebrow top-right instead of a node id.
withDefaults(defineProps<{
  title?: string
  category?: string
}>(), {
  title: 'CommunityFix',
  category: 'CommunityFix',
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

      <p style="display:block;margin:0;font-family:Oswald;font-size:30px;line-height:1;font-weight:500;letter-spacing:4px;text-transform:uppercase;color:#3b82f6;">
        {{ category }}
      </p>
    </div>

    <div style="display:flex;flex-direction:column;align-items:flex-start;width:1088px;margin-top:auto;">
      <h1 style="display:block;width:1088px;margin:0 0 26px;font-family:Oswald;font-size:84px;line-height:1.05;font-weight:500;color:#111827;line-clamp:3;text-overflow:ellipsis;">
        {{ title }}
      </h1>
      <div style="width:1088px;height:20px;background-color:#3b82f6;" />
    </div>
  </div>
</template>
