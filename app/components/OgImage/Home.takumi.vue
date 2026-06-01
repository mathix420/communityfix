<script setup lang="ts">
// Home / fallback OG image: centered brand wordmark + thick blue bottom line.
defineOptions({ inheritAttrs: false })
</script>

<template>
  <div style="display:flex;flex-direction:column;width:1200px;height:600px;background-color:#f9fafb;">
    <div style="display:flex;flex:1;flex-direction:column;align-items:center;justify-content:center;">
      <!-- align-items:stretch makes the underline match the wordmark width -->
      <div style="display:flex;flex-direction:column;align-items:stretch;">
        <p style="display:block;margin:0;font-family:Oswald;font-size:104px;line-height:1;font-weight:400;color:#111827;">
          communityfix.org
        </p>
        <div style="height:14px;margin-top:16px;background-color:#3b82f6;" />
      </div>
    </div>

    <div style="width:1200px;height:28px;background-color:#3b82f6;" />
  </div>
</template>
