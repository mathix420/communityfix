<script setup lang="ts">
// OG image for community nodes (issues, solutions, case studies, members,
// tags): wordmark top-left, kind + id top-right, big title, and a full-width
// blue bottom line flush to the canvas edge (matching the Home OG image).
const props = withDefaults(defineProps<{
  title?: string
  kind?: string
  id?: number | string
  // Optional eyebrow above the title (e.g. a case study's parent solution):
  // `subtitleLabel` is the small uppercase tag, `subtitle` the value.
  // `subtitleColor` is a 6-digit hex WITHOUT `#` (a `#` doesn't round-trip
  // through nuxt-og-image's prop encoding); the `#` is re-added in the template.
  subtitle?: string
  subtitleLabel?: string
  subtitleColor?: string
}>(), {
  title: 'CommunityFix',
  kind: 'Issue',
  id: undefined,
  subtitle: undefined,
  subtitleLabel: undefined,
  subtitleColor: '3b82f6',
})

// Pad numeric ids to the in-app "#00042" form; pass strings through.
const idLabel = computed(() => {
  if (props.id === undefined || props.id === null || props.id === '') return ''
  return typeof props.id === 'number' ? `#${String(props.id).padStart(5, '0')}` : `#${props.id}`
})
</script>

<template>
  <div style="display:flex;flex-direction:column;width:1200px;height:600px;background-color:#f9fafb;">
    <div style="display:flex;flex:1;flex-direction:column;padding:56px;">
      <div style="display:flex;flex-direction:row;width:1088px;align-items:flex-start;justify-content:space-between;gap:32px;">
        <p class="block font-mono text-[34px] leading-none font-normal text-[#404040] underline decoration-primary decoration-[3px]">communityfix.org</p>

        <div style="display:flex;flex-direction:column;align-items:flex-end;">
          <p style="display:block;margin:0;font-family:Oswald;font-size:26px;line-height:1;font-weight:500;letter-spacing:3px;text-transform:uppercase;color:#6b7280;">
            {{ kind }}
          </p>
          <p
            v-if="idLabel"
            style="display:block;margin:6px 0 0;font-family:Oswald;font-size:60px;line-height:1;font-weight:500;color:#ccc;"
          >
            {{ idLabel }}
          </p>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;align-items:flex-start;width:1088px;margin-top:auto;">
        <div
          v-if="subtitle"
          style="display:flex;flex-direction:row;align-items:center;width:1088px;margin:0 0 24px;"
        >
          <div :style="`display:flex;width:5px;height:100%;background-color:#${subtitleColor};margin-right:22px;`" />
          <div style="display:flex;flex-direction:column;width:1056px;">
            <p
              v-if="subtitleLabel"
              :style="`display:block;margin:0 0 6px;font-family:Oswald;font-size:22px;line-height:1;font-weight:500;letter-spacing:3px;text-transform:uppercase;white-space:nowrap;color:#${subtitleColor};`"
            >
              {{ subtitleLabel }}
            </p>
            <p style="display:block;width:1056px;margin:0;font-family:Oswald;font-size:40px;line-height:1.1;font-weight:500;color:#6b7280;line-clamp:1;text-overflow:ellipsis;">
              {{ subtitle }}
            </p>
          </div>
        </div>
        <h1 style="display:block;width:1088px;margin:0;font-family:Oswald;font-size:84px;line-height:1.05;font-weight:500;color:#111827;line-clamp:3;text-overflow:ellipsis;">
          {{ title }}
        </h1>
      </div>
    </div>

    <div style="width:1200px;height:28px;background-color:#3b82f6;" />
  </div>
</template>
