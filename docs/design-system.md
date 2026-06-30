# CommunityFix Design System

This document outlines the design system used throughout the CommunityFix platform.

## Brand Identity

- **Name:** communityfix.org
- **Tagline:** "Let's put our skills to work."
- **Description:** Community-Driven Solutions Platform

## Golden Rules

Non-negotiables. When in doubt, these win.

1. **Sharp lines, rounded cards.** Decorative *lines, bars and underlines* are **always sharp** (square ends, no `border-radius`, no pill shapes). *Cards, surfaces and chips* (`UiCard`, code blocks, tables, callouts, tags, inputs) **keep their rounded corners** — that softness is part of the brand. The distinction is line vs. container, never "round everything" or "sharpen everything". See [Corners & Shape Language](#corners--shape-language).
2. **Oswald for headings, Inter for body, real monospace for code.** `--font-mono` is **Oswald — a display font, not a typewriter font.** Never use it for code; code uses `--font-code`. See [Typography](#typography).
3. **Blue is the only accent.** `primary` = blue. Use it for links, CTAs, focus, markers and the title underline. Don't introduce other accent hues.
4. **Title underline = the logo underline.** Page titles get a thick, solid, *sharp* blue underline that runs under the whole word (matches the `communityfix.org` logo), not a short stub bar.
5. **High contrast, light, textured.** Near-black text on the grainy off-white background; glassmorphic white surfaces float on top.
6. **Track events with `useUmami()`, never `data-umami-event*` attributes.** (See the analytics section in `CLAUDE.md`.)

## Colors

### Primary Palette

| Token | Usage |
|-------|-------|
| `primary` | Blue - main brand color, CTAs, links, accents |
| `neutral` | Gray scale - backgrounds, borders, secondary text |

### Semantic Colors

- **Text primary:** Black (`text-black`, `text-gray-900`)
- **Text secondary:** `text-gray-600`, `text-gray-700`
- **Text muted:** `text-gray-400`, `text-gray-500`
- **Borders:** `border-gray-200`, `border-gray-200/60`
- **Backgrounds:** White with transparency (`bg-white/80`, `bg-white/90`)

### Accent Usage

- Links and interactive elements: `text-primary-600`
- Tags: `<UiTag>` or `<UiTag variant="neutral">`
- Badges: `<UiBadge>` with semantic variants
- Underline decorations: `decoration-primary`

## Typography

### Font Families

| Variable | Font | Usage |
|----------|------|-------|
| `--font-sans` | Inter | Body text, UI elements |
| `--font-mono` | Oswald | Headings, titles, display text, form labels |
| `--font-code` | `ui-monospace` system stack | Code blocks, inline code, anything literal/typewriter |

> ⚠️ **`--font-mono` is Oswald — a condensed *display* font, not a real monospace.** It is named "mono" for historical reasons. **Never render code with `font-mono`.** Code must use `--font-code` (the `font-code` utility), otherwise URLs and snippets render in condensed Oswald and look broken. Only weights **400 and 500** of Oswald are loaded (and 400 of Inter), so prefer `font-medium` over `font-bold` for headings to avoid faux-bold.

### Font Classes

```css
font-sans    /* Inter — body text, UI */
font-mono    /* Oswald — headings, titles, display, labels */
font-code    /* monospace — code only */
```

### Heading Patterns

Use the UI components for consistent typography:

**Hero/Page Titles:**
```vue
<UiPageTitle size="xl">Title Here</UiPageTitle>
<!-- or with header + description -->
<UiPageHeader title="Title Here" description="Subtitle text" />
```

**Section Titles:**
```vue
<UiPageTitle as="h2" size="md">Section Title</UiPageTitle>
<!-- or without underline -->
<UiSectionTitle>Section Title</UiSectionTitle>
```

**Card Titles:**
```vue
<UiSectionTitle as="h3">Card Title</UiSectionTitle>
```

### Prose Content (from `composables/ui.ts`)

For long-form content with typography plugin:

```ts
import { prose } from '~/composables/ui'
```

```vue
<div :class="prose">
  <!-- Markdown/HTML content -->
</div>
```

### Text Sizes

| Size | Class | Component |
|------|-------|-----------|
| Hero | `text-4xl sm:text-5xl` | `<UiPageTitle size="xl">` |
| Page title | `text-3xl sm:text-4xl` | `<UiPageTitle size="lg">` |
| Section | `text-2xl sm:text-3xl` | `<UiPageTitle size="md">` |
| Card title | `text-xl` | `<UiSectionTitle>` |
| Body | `text-base` | default |
| Small | `text-sm`, `text-xs` | labels, helper text |
| Micro | `text-[10px]` | `<UiDivider>` text |

## Spacing

### Standard Scale

| Class | Value | Usage |
|-------|-------|-------|
| `gap-1` | 0.25rem | Tight inline elements |
| `gap-2` | 0.5rem | Related elements |
| `gap-3` | 0.75rem | Form fields |
| `gap-4` | 1rem | Card content |
| `gap-5` | 1.25rem | Section spacing |
| `gap-6` | 1.5rem | Major sections |

### Card Padding

Use `UiCard` with padding prop:

```vue
<UiCard padding="sm">Compact</UiCard>   <!-- p-4 -->
<UiCard padding="md">Standard</UiCard>  <!-- p-4 sm:p-6 -->
<UiCard padding="lg">Spacious</UiCard>  <!-- p-6 sm:p-8 -->
```

### Container

The `AppContainer` component provides:
- Max width: `max-w-3xl` (768px)
- Padding: `p-4`
- Margin top: `mt-20` (80px for fixed header)

## Components

Custom UI components are available in `app/components/ui/`. They are auto-imported with the `Ui` prefix.

### UiPageTitle

Underlined heading in brand style.

```vue
<UiPageTitle>Welcome</UiPageTitle>
<UiPageTitle size="xl" center>Large Centered Title</UiPageTitle>
<UiPageTitle as="h2" size="md">Section Title</UiPageTitle>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | `'h1' \| 'h2' \| 'h3'` | `'h1'` | HTML element |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'lg'` | Text size |
| `center` | `boolean` | `false` | Center alignment |

### UiPageHeader

Page header with title and optional description.

```vue
<UiPageHeader title="Settings" description="Manage your account" />
<UiPageHeader title="Dashboard" center />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | required | Page title |
| `description` | `string` | - | Subtitle text |
| `center` | `boolean` | `false` | Center alignment |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'lg'` | Title size |

### UiSectionTitle

Simple section heading without underline.

```vue
<UiSectionTitle>Related Issues</UiSectionTitle>
<UiSectionTitle as="h3">Comments</UiSectionTitle>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | `'h2' \| 'h3' \| 'h4'` | `'h2'` | HTML element |

### UiCard

Container with glass effect and rounded corners.

```vue
<UiCard>Default card content</UiCard>
<UiCard variant="interactive" padding="sm">Hoverable card</UiCard>
<UiCard variant="solid" padding="lg">Solid background</UiCard>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'interactive' \| 'solid'` | `'default'` | Visual style |
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg'` | `'md'` | Inner padding |

### UiDivider

Horizontal divider with optional text.

```vue
<UiDivider />
<UiDivider text="or" />
<UiDivider text="or continue with" />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | - | Center text |

### UiTag

Interactive tag/chip element.

```vue
<UiTag>Feature</UiTag>
<UiTag variant="neutral" size="sm">Draft</UiTag>
<UiTag variant="outline" rounded="md">Category</UiTag>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'neutral' \| 'outline'` | `'primary'` | Color style |
| `size` | `'sm' \| 'md'` | `'md'` | Size |
| `rounded` | `'md' \| 'full'` | `'full'` | Border radius |

### UiBadge

Small status/count indicator.

```vue
<UiBadge>12</UiBadge>
<UiBadge variant="primary">New</UiBadge>
<UiBadge variant="success">Active</UiBadge>
<UiBadge variant="error">Failed</UiBadge>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'primary' \| 'success' \| 'warning' \| 'error'` | `'default'` | Color style |

### UiNavTabs

Animated tab navigation (existing component).

### Nuxt UI Components

Buttons, forms, and other primitives use [Nuxt UI](https://ui.nuxt.com/).

**Buttons:**
```vue
<UButton color="primary">Primary Action</UButton>
<UButton variant="soft" color="neutral">Secondary</UButton>
<UButton variant="link">Link Style</UButton>
```

**Form Fields:**
```vue
<UFormGroup label="Email" name="email">
  <UInput v-model="email" type="email" size="lg" />
</UFormGroup>
```

### Example: Page Layout

Combining components for a typical page:

```vue
<template>
  <AppContainer>
    <UiPageHeader
      title="Settings"
      description="Manage your account preferences"
    />

    <UiCard class="flex flex-col gap-6">
      <UiSectionTitle>Profile</UiSectionTitle>

      <form class="grid gap-4">
        <UFormGroup label="Name" name="name">
          <UInput v-model="name" />
        </UFormGroup>

        <UFormGroup label="Email" name="email">
          <UInput v-model="email" type="email" />
        </UFormGroup>

        <UiDivider />

        <div class="flex gap-2">
          <UiBadge variant="success">Verified</UiBadge>
          <UiTag size="sm">Pro Plan</UiTag>
        </div>

        <UButton color="primary">Save Changes</UButton>
      </form>
    </UiCard>
  </AppContainer>
</template>
```

## Long-form Content (Markdown / Prose)

The content pages — **Whitepaper, MCP docs, Privacy, Terms, Guides** — render markdown from `@nuxt/content`. Their look is centrally themed; **don't restyle these pages individually.**

### How it's wired

- Markdown renders through **Nuxt UI v4 prose components** (`ProseH1`, `ProseP`, `ProsePre`, `ProseTable`, …), *not* the Tailwind Typography `prose` class. The same components also back `<UiMarkdown>` in issue/case-study cards.
- **Element styling is global**, in `app/app.config.ts` under `ui.prose.*`. Each key extends the Nuxt UI default, so you only specify what changes:
  - headings → Oswald (`font-mono font-medium`)
  - inline code & code blocks → `font-code` (real monospace)
  - links, list markers, table headers, blockquote accent → `primary`
  - code/table/blockquote/image surfaces stay **rounded**
- **Page-level chrome** (the sharp title underline, the hairline section dividers between `h2`s) is scoped to the `.prose-doc` class in `app/assets/css/main.css`, and applied as `class="prose-doc"` on the `<ContentRenderer>`. Keep it off card markdown so cards stay compact.
- **Do not** add the Tailwind `prose` class next to `prose-doc` — its link styles underline heading anchors.

### Headings in content

- `h2`/`h3` show a plain blue underline **on hover** — never the floating `#` anchor chip (it's hidden via the `leading` slot).
- Section `h2`s are separated by a sharp hairline divider (top border), not a boxed card.

### Code highlighting

Syntax highlighting uses **Shiki with the `github-light` theme**, set in `nuxt.config.ts` → `mdc.highlight.theme`. The site is light-only (`ui.colorMode: false`); don't reintroduce the washed-out `material-theme` default. Code blocks sit on a light `bg-gray-50` surface with a rounded border.

### Adding a new content page

1. Author markdown in `content/` (or `content/guide/` for guides).
2. Add a page that renders `<ContentRenderer class="prose-doc" :value="page" />` inside `<AppContainer>`.
3. Don't add bespoke prose CSS — extend `ui.prose` in `app.config.ts` if a global tweak is genuinely needed.

## Layout

### App Structure

```
<Body class="grainy">
  <UApp>
    <AppHeader />   <!-- Fixed, glassmorphic -->
    <NuxtPage />
    <AppFooter />
  </UApp>
</Body>
```

### Header

- Fixed positioning with `z-10`
- Glassmorphic: `bg-white/5 backdrop-blur-md`
- Logo left, auth/nav right
- Monospace font for nav links

### Footer

- Separator lines with `border-gray-200`
- Links: Whitepaper, Privacy, Terms
- Social icons: Umami, Bluesky, GitHub
- MIT License attribution

## Effects

### Corners & Shape Language

This is the rule people get wrong most often, so it gets its own section.

| Element type | Corners | Examples |
|--------------|---------|----------|
| **Decorative lines / bars / underlines** | **Sharp** — no radius, square ends | Title underline, section dividers, heading hover underline, accent bars |
| **Cards / surfaces / containers** | **Rounded** | `UiCard` (`rounded-2xl` / `rounded-lg`), code blocks (`rounded-xl`), tables (`rounded-md`), callouts, the pending-review banner |
| **Chips / pills / badges / inputs** | **Rounded** | `UiTag`, `UiBadge`, inline code, form fields, tabs |

✅ Title underline — sharp blue line under the whole word:

```css
.title-underline {
  text-decoration-line: underline;
  text-decoration-color: var(--ui-primary);
  text-decoration-thickness: 4px;
  text-underline-offset: 0.5rem;
  text-decoration-skip-ink: none; /* solid bar through descenders, like the logo */
}
```

(The reusable `underlinedTitle` constant in `composables/ui.ts` is the Tailwind equivalent for `<h1>` page titles outside of markdown.)

❌ Never give a line a `border-radius` (no `rounded-full` pill bars). ✅ Never strip the radius off a card to make it "sharper".

### Grainy Background

Applied to body via `.grainy` class - creates textured background using SVG fractal noise.

### Glassmorphism

```css
bg-white/80 backdrop-blur-sm  /* Light glass */
bg-white/5 backdrop-blur-md   /* Dark glass (header) */
```

### Transitions

- Color changes: `transition-colors`
- General: `transition-all duration-300`

### Interactive States

- Hover backgrounds: `hover:bg-gray-50`, `hover:bg-gray-100`
- Hover text: `hover:underline`
- Focus: Handled by Nuxt UI components

## Icons

### Icon Sets

- **Lucide:** UI icons (`i-lucide-*`)
- **Font Awesome 6 Brands:** Social/brand icons (`i-fa6-brands-*`)

### Common Icons

| Icon | Class |
|------|-------|
| Key/Passkey | `i-lucide-key-round` |
| Google | `i-fa6-brands-google` |
| Apple | `i-fa6-brands-apple` |
| GitHub | `i-fa6-brands-github` |
| Bluesky | `i-fa6-brands-bluesky` |

## Responsive Breakpoints

Following Tailwind defaults:

| Prefix | Min-width |
|--------|-----------|
| `sm:` | 640px |
| `md:` | 768px |
| `lg:` | 1024px |

Common patterns:
- `text-3xl sm:text-4xl` - Scale up headings
- `p-6 sm:p-8` - More padding on larger screens
- `grid-cols-1 sm:grid-cols-2` - Stack on mobile, grid on desktop

## Accessibility

- High contrast text (black on white)
- Clear focus states via Nuxt UI
- Semantic HTML structure
- ARIA labels on interactive elements

## File Locations

| File | Purpose |
|------|---------|
| `app/app.config.ts` | UI colors **and the global `ui.prose` markdown theme** |
| `app/app.vue` | Root layout |
| `app/assets/css/main.css` | CSS theme, fonts (`--font-code`), custom utilities, `.prose-doc` content chrome |
| `nuxt.config.ts` | `mdc.highlight.theme` (Shiki `github-light`), fonts, modules |
| `app/composables/ui.ts` | Reusable style constants (`underlinedTitle`, `prose`) |
| `app/components/ui/Markdown.vue` | Inline markdown renderer for cards (`<UiMarkdown>`) |
| `app/components/app/Header.vue` | Header component |
| `app/components/app/Footer.vue` | Footer component |
| `app/components/ui/PageTitle.vue` | Underlined page title |
| `app/components/ui/PageHeader.vue` | Page header with title/description |
| `app/components/ui/SectionTitle.vue` | Section heading |
| `app/components/ui/Card.vue` | Card container |
| `app/components/ui/Divider.vue` | Text divider |
| `app/components/ui/Tag.vue` | Tag/chip element |
| `app/components/ui/Badge.vue` | Status badge |
| `app/components/ui/NavTabs.vue` | Tab navigation |
