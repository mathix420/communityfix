// YAML step files are bundled as text — Wrangler via a `Text` module rule
// (wrangler.jsonc), vitest via a `load` plugin (vitest.config.ts). Both deliver
// the raw file contents as the default export, parsed once in steps.ts.
declare module '*.yaml' {
  const content: string
  export default content
}
