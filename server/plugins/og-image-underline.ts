// nuxt-og-image wraps every Takumi OG image in a root node with
// `overflow: hidden` (its core/vnodes.js). Takumi's paint-bounds calc ignores
// text-decoration ink, so a clipping ancestor crops the underline off the
// bottom of text glyphs — dropping the blue brand underline under our
// `communityfix.org` wordmark. Relaxing the root to `overflow: visible` lets
// the real underline paint; the image is still bounded by the fixed render
// canvas, so nothing actually spills out.
interface TakumiNode {
  style?: Record<string, unknown>
  children?: TakumiNode[] | string
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('nuxt-og-image:takumi:nodes', (nodes: TakumiNode) => {
    if (nodes?.style?.overflow === 'hidden') {
      nodes.style.overflow = 'visible'
    }
  })
})
