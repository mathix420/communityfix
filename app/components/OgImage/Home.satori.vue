<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
})
</script>

<template>
  <div
    :style="{
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      textAlign: 'center',
      position: 'relative',
    }"
  >
    <h1
      :style="{
        fontFamily: 'Oswald',
        fontSize: '128px',
        fontWeight: 400,
        color: 'rgba(0, 0, 0, 0.8)',
        textDecoration: 'underline',
        textDecorationColor: '#3b82f6',
        marginBottom: '40px',
      }"
    >
      communityfix.org
    </h1>
    <p
      :style="{
        fontFamily: 'Oswald',
        fontSize: '60px',
        color: 'rgba(0, 0, 0, 0.8)',
      }"
    >
      Let's put our skills to work.
    </p>

    <div
      :style="{
        position: 'absolute',
        bottom: '40px',
        right: '40px',
        display: 'flex',
        gap: '16px',
      }"
    >
      <div :style="{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#3b82f6' }" />
      <div :style="{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#60a5fa' }" />
      <div :style="{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#93c5fd' }" />
    </div>
  </div>
</template>
