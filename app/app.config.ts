export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'neutral',
    },
    // Brand theme for rendered markdown (Nuxt UI prose components, used by
    // ContentRenderer on content pages and by <MDC> in UiMarkdown). Headings
    // use Oswald (our display `--font-mono`); code uses a real monospace
    // (`--font-code`) instead of Oswald; lists/tables/quotes pick up the
    // primary accent. Page-level chrome lives in `.prose-doc` (main.css).
    prose: {
      h1: {
        slots: {
          base: 'font-mono font-medium tracking-tight text-4xl sm:text-5xl mb-6',
        },
      },
      h2: {
        slots: {
          base: 'font-mono font-medium text-2xl sm:text-3xl mt-12 mb-5',
          // Hide the floating "#" anchor chip; show a plain underline on hover.
          leading: 'lg:hidden',
          link: 'group hover:underline decoration-primary decoration-2 underline-offset-4',
        },
      },
      h3: {
        slots: {
          base: 'font-mono font-medium text-xl mt-8 mb-3',
          leading: 'lg:hidden',
          link: 'group hover:underline decoration-primary decoration-2 underline-offset-4',
        },
      },
      h4: {
        slots: {
          base: 'font-mono font-medium uppercase tracking-wider text-sm text-muted mt-6 mb-2',
          link: 'hover:underline decoration-primary decoration-2 underline-offset-4',
        },
      },
      p: {
        base: 'text-gray-600',
      },
      a: {
        base: 'text-primary-600 decoration-primary/40 hover:decoration-primary',
      },
      strong: {
        base: 'font-semibold text-highlighted',
      },
      ul: {
        base: 'marker:text-primary',
      },
      ol: {
        base: 'marker:text-primary marker:font-mono marker:font-medium',
      },
      blockquote: {
        // Cards/surfaces stay rounded (brand convention); only decorative
        // lines are sharp.
        base: 'border-s-4 border-primary bg-primary/5 ps-4 pe-4 py-2 rounded-e-md not-italic text-gray-600',
      },
      hr: {
        base: 'border-gray-200/80 my-10',
      },
      code: {
        base: 'font-code',
      },
      pre: {
        slots: {
          base: 'font-code bg-gray-50 border-gray-200 rounded-xl px-4 py-3.5',
          header: 'bg-gray-50 border-gray-200 rounded-t-xl',
        },
      },
      thead: {
        base: 'bg-gray-50',
      },
      th: {
        base: 'font-mono font-medium uppercase tracking-wide text-xs text-gray-600 border-gray-200',
      },
      td: {
        base: 'text-gray-600 border-gray-200',
      },
    },
  },
})
