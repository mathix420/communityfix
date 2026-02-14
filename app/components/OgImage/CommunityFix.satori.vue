<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string
  number?: number
  description?: string
  solutionCount?: number
  subIssueCount?: number
  commentCount?: number
  sourceCount?: number
}>(), {
  title: 'title',
  number: 1,
  description: 'description',
  solutionCount: 0,
  subIssueCount: 0,
  commentCount: 0,
  sourceCount: 0,
})

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
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      borderBottom: '20px solid #3b82f6',
      backgroundColor: '#f9fafb',
      color: 'rgba(0, 0, 0, 0.8)',
    }"
  >
    <div :style="{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', height: '100%', width: '100%' }">
      <div :style="{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', height: '100%' }">
        <!-- Header with title and number -->
        <div :style="{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '60px 80px 0 80px', gap: '40px' }">
          <h1
            :style="{
              fontFamily: 'Oswald',
              fontSize: '60px',
              fontWeight: 500,
              width: '100%',
              maxWidth: '750px',
              textDecoration: 'underline',
              textDecorationColor: '#3b82f6',
              lineHeight: 1.4,
            }"
          >
            {{ props.title }}
          </h1>
          <p
            v-if="props.number"
            :style="{
              fontFamily: 'Oswald',
              fontSize: '70px',
              color: 'rgba(0, 0, 0, 0.2)',
              lineHeight: 1,
              flexShrink: 0,
            }"
          >
            {{ formatNumber(props.number) }}
          </p>
        </div>

        <!-- Description -->
        <p
          v-if="props.description"
          :style="{
            fontSize: '30px',
            padding: '0 80px 40px 80px',
            maxWidth: '1200px',
          }"
        >
          {{ props.description }}
        </p>

        <!-- Stats -->
        <div :style="{ display: 'flex', flexDirection: 'row', width: '100%', padding: '0 80px 40px 80px', marginTop: 'auto', gap: '48px' }">
          <div v-if="props.subIssueCount" :style="{ display: 'flex', flexDirection: 'column' }">
            <p :style="{ fontFamily: 'Oswald', fontSize: '50px', lineHeight: 1, marginBottom: '-12px', color: 'rgba(0, 0, 0, 0.2)' }">
              {{ formatNumber(props.subIssueCount, { hash: false }) }}
            </p>
            <p :style="{ fontSize: '18px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(0, 0, 0, 0.6)' }">
              Sub Issues
            </p>
          </div>
          <div v-if="props.solutionCount" :style="{ display: 'flex', flexDirection: 'column' }">
            <p :style="{ fontFamily: 'Oswald', fontSize: '50px', lineHeight: 1, marginBottom: '-12px', color: 'rgba(0, 0, 0, 0.2)' }">
              {{ formatNumber(props.solutionCount, { hash: false }) }}
            </p>
            <p :style="{ fontSize: '18px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(0, 0, 0, 0.6)' }">
              Solutions
            </p>
          </div>
          <div v-if="props.commentCount" :style="{ display: 'flex', flexDirection: 'column' }">
            <p :style="{ fontFamily: 'Oswald', fontSize: '50px', lineHeight: 1, marginBottom: '-12px', color: 'rgba(0, 0, 0, 0.2)' }">
              {{ formatNumber(props.commentCount, { hash: false }) }}
            </p>
            <p :style="{ fontSize: '18px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(0, 0, 0, 0.6)' }">
              Comments
            </p>
          </div>
          <div v-if="props.sourceCount" :style="{ display: 'flex', flexDirection: 'column' }">
            <p :style="{ fontFamily: 'Oswald', fontSize: '50px', lineHeight: 1, marginBottom: '-12px', color: 'rgba(0, 0, 0, 0.2)' }">
              {{ formatNumber(props.sourceCount, { hash: false }) }}
            </p>
            <p :style="{ fontSize: '18px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(0, 0, 0, 0.6)' }">
              Sources
            </p>
          </div>
        </div>

        <!-- Footer -->
        <p
          :style="{
            fontFamily: 'Oswald',
            fontSize: '24px',
            fontWeight: 700,
            padding: '0 80px 40px 80px',
            marginBottom: 0,
            textAlign: 'right',
          }"
        >
          communityfix.org
        </p>
      </div>
    </div>
  </div>
</template>
