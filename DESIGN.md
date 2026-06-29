# Rivalscope — Design System: shadcn neutral-modern (zinc + single blue accent)

**Direction:** Clean, confident competitive-intelligence tool. Zinc-neutral canvas, one blue accent, Geist type. Sharp enough to read as a professional product; uncluttered enough to let the data breathe.
**Personality:** Precise, trustworthy, fast. Reads like a well-engineered developer tool, not a pastel SaaS or a branded terminal.
**Memorable thing:** Single blue on zinc neutrals — one accent, used only where there's meaning (primary action, active/selected state, focus, signal/live dots, links). Everything else is zinc.

> **Supersedes** v4 "Signal Desk" (navy `#080b14` + electric blue, sharp 4px, Space Grotesk, `data-theme="ink|paper"`) and all prior versions. The source of truth is `frontend/src/app/globals.css` (`:root`, `.dark`, and `@theme inline` blocks) and `frontend/components.json`. This doc describes what's actually in the code.

---

## Theme System — dark-first, `.dark` class

Dark is the default a fresh visitor lands on. Light is a first-class alternate via the theme toggle.

**Mechanism:** A pre-paint inline script in `layout.tsx` adds the `.dark` class to `<html>` on first visit (shadcn convention). A saved `localStorage 'theme' = 'light'` overrides to light. `useTheme()` (`lib/use-theme.ts`) returns `{ theme: 'light' | 'dark', setTheme, toggle }` and drives the toggle. This **replaces** the old `data-theme="ink|paper"` attribute system.

**Custom variant:** `@custom-variant dark (&:is(.dark *))` in globals.css — dark overrides target `.dark` descendants, not `@media prefers-color-scheme`.

---

## Color Tokens — zinc neutrals + single blue primary

All tokens are oklch. The `@theme inline` block emits them as Tailwind `--color-*` utilities.

### Light (`:root`)

| Token | Value | Approx | Usage |
|-------|-------|--------|-------|
| `--background` | `oklch(1 0 0)` | white | Page background |
| `--foreground` | `oklch(0.141 0.005 285.823)` | zinc-950 | Primary text |
| `--card` | `oklch(1 0 0)` | white | Card surface |
| `--card-foreground` | `oklch(0.141 0.005 285.823)` | zinc-950 | Card text |
| `--popover` | `oklch(1 0 0)` | white | Popover/dropdown surface |
| `--primary` | `oklch(0.546 0.245 262.881)` | blue-600 | **Single accent — links, active, focus, signals, in-app cta** |
| `--primary-foreground` | `oklch(0.985 0 0)` | near-white | Text on primary fills |
| `--secondary` | `oklch(0.967 0.001 286.375)` | zinc-100 | Secondary surfaces |
| `--muted` | `oklch(0.967 0.001 286.375)` | zinc-100 | Muted fills, subtle backgrounds |
| `--muted-foreground` | `oklch(0.552 0.016 285.938)` | zinc-500 | Placeholder, secondary text |
| `--accent` | `oklch(0.967 0.001 286.375)` | zinc-100 | Hover fills (not the brand accent) |
| `--destructive` | `oklch(0.577 0.245 27.325)` | red | Error / destructive |
| `--border` | `oklch(0.92 0.004 286.32)` | zinc-200 | Default borders |
| `--input` | `oklch(0.871 0.006 286.286)` | zinc-300 | Input borders |
| `--ring` | `oklch(0.546 0.245 262.881)` | = primary | Focus ring |

### Dark (`.dark`)

| Token | Value | Approx | Usage |
|-------|-------|--------|-------|
| `--background` | `oklch(0.141 0.005 285.823)` | zinc-950 | Page background |
| `--foreground` | `oklch(0.985 0 0)` | near-white | Primary text |
| `--card` | `oklch(0.21 0.006 285.885)` | zinc-900 | Card surface |
| `--primary` | `oklch(0.623 0.214 259.815)` | blue-500 | **Single accent — brighter for dark bg** |
| `--secondary` | `oklch(0.274 0.006 286.033)` | zinc-800 | Secondary surfaces |
| `--muted` | `oklch(0.274 0.006 286.033)` | zinc-800 | Muted fills |
| `--muted-foreground` | `oklch(0.705 0.015 286.067)` | zinc-400 | Placeholder, secondary text |
| `--border` | `oklch(1 0 0 / 10%)` | white/10% | Default borders |
| `--input` | `oklch(1 0 0 / 15%)` | white/15% | Input borders |
| `--ring` | `oklch(0.623 0.214 259.815)` | = primary | Focus ring |

`--chart-1` through `--chart-5` are also defined in both themes; charts read them via `useChartPalette()` (`lib/chart-theme.ts`) — blue/zinc palette. **Never hardcode a chart stroke/fill.**

---

## Accent Discipline — one blue, used sparingly

Blue is the only brand color. It appears on: primary CTAs, active/selected nav items, links, focus rings, and signal/live dots. **Never as a background wash on content surfaces, never on decorative cards.** Not an error color (errors use `--destructive`).

**Landing/marketing primary CTAs use monochrome foreground-fill** (`bg-foreground` — white-on-dark / black-on-light, Linear/Vercel register), **not** blue. Blue on a CTA is reserved for the **in-app** signature action button (the `cta` button variant — Upgrade/Analyze). On the landing, blue stays a pure signal color (links, active/selected, focus rings, signal/live dots, the highlighted-pricing-card ring).

The `sky-*` Tailwind scale is remapped in `@theme inline` to the blue primary (theme-aware via `var(--primary)`), so legacy `sky-*` utilities render the accent color. Do not introduce raw blue hex outside the token system.

---

## Typography — Geist Sans + Geist Mono

Loaded via the `geist` npm package; fed into CSS variables:

| Variable | Font | Usage |
|----------|------|-------|
| `--font-geist-sans` → `--font-sans` | Geist Sans | UI text, display, nav, labels, paragraphs |
| `--font-geist-mono` → `--font-mono` | Geist Mono | Code, numerals, timestamps, mono badges |

`--font-archivo` is kept as a legacy alias → `var(--font-geist-sans)` so old markup that referenced it continues to render Geist during migration.

**Replaces** Space Grotesk + IBM Plex Mono from v4 "Signal Desk."

---

## Radius

Base: `--radius: 0.5rem`. The scale derives from it:

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `calc(var(--radius) * 0.6)` ≈ 0.3rem | Badges / tags |
| `--radius-md` | `calc(var(--radius) * 0.8)` ≈ 0.4rem | Buttons / inputs (`rounded-lg`) |
| `--radius-lg` | `var(--radius)` = 0.5rem | Standard elements |
| `--radius-xl` | `calc(var(--radius) * 1.4)` ≈ 0.7rem | shadcn `<Card>` (`rounded-xl`) |
| `--radius-pill` | `9999px` | Pills / avatars |

shadcn `<Card>` uses `rounded-xl` by design — this is intentional, not a deviation.

---

## Spacing (8pt scale, unchanged)

```
4  8  12  16  24  32  48  64
```

All gaps/padding/margins use this scale. No arbitrary values.

---

## Motion (unchanged from v4)

- Durations: `--duration-fast 100ms`, `--duration-base 160ms`, `--duration-slow 240ms`
- Easing: `--ease-smooth: cubic-bezier(0.16,1,0.3,1)` · `--ease-out: cubic-bezier(0,0,0.2,1)`
- Purposeful only: fades, staggered reveals, hover states. **No spring/bounce, no `transition: all`.** Animate `transform`/`opacity` only.
- `prefers-reduced-motion: reduce` collapses everything to instant AND forces scroll-reveal content visible (the `[style*="opacity:0"]` override in globals.css — required; without it, reduced-motion users see blank sections).

---

## Shadows — flat cards, elevation only for overlays

| Token | Value |
|-------|-------|
| `--shadow-card` | `none` |
| `--shadow-card-hover` | `none` |
| `--shadow-elevated` | light: `0 8px 24px rgba(0,0,0,0.10)` / dark: `0 8px 32px rgba(0,0,0,0.6)` |
| `--shadow-modal` | light: `0 24px 60px rgba(0,0,0,0.18)` / dark: `0 24px 64px rgba(0,0,0,0.7)` |

Depth is carried by zinc surface steps + hairline borders. Shadows only for floating overlays (dropdowns, modals, toasts).

---

## shadcn/ui Components

**Config:** `frontend/components.json` — style `radix-nova`, baseColor `neutral` (overridden to zinc in globals.css), `cssVariables: true`, iconLibrary `lucide`.

**Primitives in `frontend/src/components/ui/`:**
button, input, label, textarea, card, dialog, alert-dialog, dropdown-menu, select, tabs, badge, switch, checkbox, sonner, tooltip, separator, skeleton, table, sheet, avatar, popover, scroll-area.

**Toaster:** `sonner` Toaster mounted in `layout.tsx`.

All new components should be built from these shadcn primitives where possible, using CSS-var tokens — not raw Tailwind colors or hardcoded hex.

---

## Semantic Status Tokens — `--tone-*`

Theme-aware semantic colors for status indicators; light and dark values differ:

| Token | Light | Dark |
|-------|-------|------|
| `--tone-positive` | `#1f5d3f` | `#5aa07a` |
| `--tone-warning` | `#8a5a12` | `#c79a4e` |
| `--tone-danger` | `#b3261e` | `#f87171` |
| `--tone-repositioning` | `#6d4f9c` | `#9b7fc7` |
| `--tone-neutral` | `#5b6470` | `#9aa3af` |

Never hardcode these colors — use the `--tone-*` tokens so they flip correctly on theme switch.

---

## Change-Type Badge Classes — `.badge-*` / `.tag-*`

Semantic, theme-aware, defined in globals.css with `.dark` overrides. Use `change-badge.tsx`.

| Class | Light color | Dark color |
|-------|-------------|------------|
| `.badge-pricing_change` | amber `#8a5a12` | `#c79a4e` |
| `.badge-feature_add` / `.badge-new_feature` | green `#1f5d3f` | `#5aa07a` |
| `.badge-repositioning` / `.badge-positioning_shift` | violet `#6d4f9c` | `#9b7fc7` |
| `.badge-review_trend` | teal `#2c6f6f` | `#4f9d9d` |
| `.badge-minor_copy` | slate `#5b6470` | `#9aa3af` |
| `.badge-initial_scan` | blue `#345781` | `#2e8bff` |

`.tag-amber/green/blue/violet/red/orange` follow the same pattern with `.dark` overrides. These are retained as-is through the migration.

---

## Legacy Alias Layer — transitional, retire in P4

`globals.css` intentionally keeps a legacy-token alias block that maps old Signal Desk names to the new shadcn tokens:

```css
--surface-base:   var(--background);
--text-primary:   var(--foreground);
--accent-primary: var(--primary);
/* … ~19 mappings total */
```

This allows approximately 19 not-yet-migrated files (some aux pages and shared components that still use `--surface-*`, `--text-*`, `--accent-*` token names) to keep rendering correctly in the new palette without a flag day.

**TODO (P4):** Migrate all remaining legacy-token usages to direct shadcn token names (`--background`, `--foreground`, `--primary`, etc.), then remove the alias block entirely. Do not add new code that uses the legacy names — use the shadcn tokens directly.

---

## Charts

Chart colors come from `lib/chart-theme.ts`, consumed via `useChartPalette()` (theme-aware, swaps on `.dark`). Use `--chart-1` through `--chart-5` tokens, plus the palette's semantic keys (`positive`, `warning`, `danger`, `neutral`). **Never hardcode a stroke or fill.**

---

## Responsive Behavior

| Breakpoint | Min width | Tailwind | Notes |
|------------|-----------|----------|-------|
| Mobile | base | (none) | Single column |
| Tablet | 640px | `sm:` | Two-up grids begin |
| Desktop | 768px | `md:` | Primary layout target |
| Wide | 1024px | `lg:` | Max content width ~1280px, centered |

- Touch targets ≥ 44px on touch-reachable controls. WCAG AA 2.5.8.
- No horizontal scroll at any width; never `user-scalable=no`.
- `xl:` / `2xl:` intentionally unused.

---

## Do's & Don'ts

**Do:** use shadcn primitives from `components/ui/`; use CSS-var tokens (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--ring`, `--tone-*`); keep blue for active state, focus rings, links, signal dots, and the in-app cta button only (landing primary CTAs are monochrome foreground-fill); carry depth via zinc surface steps + hairline borders; use `tabular-nums` on every numeric/timestamp cell; draw charts from `useChartPalette()`.

**Don't ship:** hardcoded hex or `text-white`/`bg-white` outside of verified-contrast accent surfaces; raw blue hex outside `--primary`; 8px/12px radii (old v2 style); spring/bounce motion; `transition: all`; new code referencing the legacy `--surface-*`/`--text-*`/`--accent-*` token names (use shadcn names); blue as a decorative background wash on content cards; glassmorphism; emoji as headings.

---

## Constraints (enforced)

- **shadcn tokens only** in new code: `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--muted-foreground`, `--accent`, `--border`, `--input`, `--ring`, `--destructive`, `--card`, `--popover`, `--tone-*`. Legacy aliases are transitional — do not extend them.
- **WCAG AA** on all text; real `:focus-visible` rings (using `--ring`); full keyboard nav.
- **Theme-aware:** every component must render correctly in both `.dark` and light; test both before shipping.
- **Honesty principle:** the landing promises only what the app delivers. Real sample data on marketing, never invented metrics.
- Frontend-only; do not break existing routes or the `/api/v1/*` contract.

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-29 | Landing primary CTAs go monochrome (foreground-fill) | Faithful Linear/Vercel port + de-neon; blue stays a pure signal color. In-app `cta` variant (Upgrade/Analyze) keeps its blue gradient — marketing-vs-app boundary. |
| 2026-06-23 | shadcn neutral-modern re-theme | Whole-app migration from v4 "Signal Desk" to shadcn/ui primitives + zinc neutrals + single blue primary; eliminates custom token sprawl, standardizes on shadcn component library. |
| 2026-06-23 | Dark-first via `.dark` class (shadcn convention) | Replaces old `data-theme="ink|paper"` attribute. Pre-paint script in `layout.tsx` applies `.dark` on first visit; `localStorage 'theme'` persists choice. |
| 2026-06-23 | Geist Sans + Geist Mono | Replaces Space Grotesk + IBM Plex Mono. Loaded via `geist` package. `--font-archivo` kept as alias during migration. |
| 2026-06-23 | Legacy alias layer retained in P4 | ~19 files still use Signal Desk token names; aliases bridge the gap without a flag day. Retire after migration complete. |
| 2026-06-19 | Honesty principle | UI must not over-promise data it doesn't have. Landing + app must match. |

_Prior v4 "Signal Desk" history retained in git. Superseded by this doc for the shadcn re-theme._
