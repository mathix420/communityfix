<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  number?: number
  description?: string
}>(), {
  title: 'CommunityFix',
  number: 0,
  description: '',
})
</script>

<template>
  <div
    style="display:flex;flex-direction:column;width:1200px;height:600px;background-color:#f9fafb;padding:40px;"
  >
    <div style="display:flex;flex-direction:row;width:1120px;align-items:flex-start;justify-content:space-between;gap:40px;">
      <h1
        style="display:block;width:920px;margin:0;font-family:Oswald;font-size:60px;line-height:1.1;font-weight:500;color:#1e2939;line-clamp:3;text-overflow:ellipsis;"
      >
        {{ title }}
      </h1>
      <p
        v-if="number"
        style="display:block;margin:0;font-family:Oswald;font-size:72px;line-height:1;color:#d1d5dc;"
      >
        #{{ number }}
      </p>
    </div>

    <p
      v-if="description"
      style="display:block;width:1120px;margin:24px 0 0;font-size:24px;line-height:1.4;color:#4a5565;line-clamp:3;text-overflow:ellipsis;"
    >
      {{ description }}
    </p>

    <div style="width:1120px;height:16px;margin-top:auto;background-color:#3080ff;" />
    <p style="display:block;width:1120px;margin:16px 0 0;font-family:Oswald;font-size:20px;font-weight:700;color:#1e2939;text-align:right;">
      communityfix.org
    </p>
  </div>
</template>
