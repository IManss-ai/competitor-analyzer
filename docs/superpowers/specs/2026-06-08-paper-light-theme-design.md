# Paper-Light Theme + Theme Toggle — Design Spec

**Date:** 2026-06-08
**Status:** Approved for planning
**Scope:** Frontend only (`frontend/src/`). No backend changes.
**Design source of truth:** `DESIGN.md` (v3 "Intelligence Desk"), `DESIGN-REBUILD-PLAN.md`.

---

## Goal

Add the **paper-light** theme and a **toggle** so Rivalscope renders in either paper (light)
or ink (dark). The app currently ships ink-only. After this work:

- A **new visitor follows their OS** `prefers-color-scheme` (light OS → paper, dark OS → ink).
- A **saved choice overrides OS** and persists across visits.
- **Ink looks exactly as it does today** (current values moved verbatim, not re-derived).
- **Paper looks right on every screen**, including charts and the public landing + share pages.
- No flash of the wrong theme on load (FOUC-free).

This is the remaining v3 "phase 2" item. Backend intelligence, data, and API are untouched —
this changes only how the frontend draws.

---

## Non-Goals

- No backend, pipeline, API, or data-model changes.
- No new bespoke broadsheet relayouts (that is the *next* queued item, tracked separately).
- No redesign of the ink theme — it must remain visually identical to production today.
- No third-party theming dependency (e.g. `next-themes`). Hand-rolled, ~30 lines.

---

## Architecture (Approach A: hand-rolled `data-theme`)

Single source of truth: a `data-theme` attribute on `<html>`.

- **`:root`** holds **paper** tokens (the default).
- **`html[data-theme="ink"]`** overrides with **ink** tokens (today's exact values).
- **OS fallback** with zero JS:
  ```css
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme]) { /* ink token overrides */ }
  }
  ```
  A dark-OS first-visitor sees ink before any script runs.
- **Pre-paint script** (blocking, inline in `<head>`): reads `localStorage.theme`; if present,
  sets `data-theme` on `<html>` before first paint (overrides OS, no flash). If absent, does
  nothing and the CSS media query decides.
- **`useTheme` hook**: reads the effective current theme (saved value, else OS), and a
  `setTheme(t)` / `toggle()` that writes `localStorage.theme` + updates `data-theme`.
  No React context/provider — the attribute is the state.

Rationale over alternatives: cookie-based SSR can't read OS preference server-side (still needs
the CSS fallback or flashes) and forces the root layout dynamic; `next-themes` adds a dependency
against a customized Next fork (`frontend/AGENTS.md`). Approach A is dependency-free, FOUC-free,
and OS-aware.

---

## Components & Files

### 1. `frontend/src/app/globals.css` — token restructure
- Move current ink values out of `:root` into `html[data-theme="ink"]`, **verbatim**.
- Populate `:root` with **paper** tokens from `DESIGN.md`:
  - `--surface-base #f5f2ec`, `--surface-raised #ffffff`, `--surface-overlay`/`--surface-subtle` per paper.
  - `--text-primary #1a1714`, `--text-secondary #6b6258`, `--text-muted #9a9186`.
  - `--border-default rgba(26,23,20,0.12)`, `--border-subtle rgba(26,23,20,0.07)`, `--border-strong`.
  - Shadow scale: paper stays flat (`--shadow-card: none`), elevated/modal shadows softened for light.
- Add the `@media (prefers-color-scheme: dark) :root:not([data-theme])` ink-fallback block.
- **Accent theme-aware:** redefine remapped `--color-sky-*` per theme — paper uses a darker
  slate-blue (`#345781`/`#2c5a8b` range) for WCAG contrast on white; ink keeps `#4f7cb0`.
  Also set `--accent-primary`/`--accent-hover`/`--accent-subtle`/`--accent-border`/`--accent-glow`
  per theme. Tailwind v4 `sky-*` utilities reference `var(--color-sky-*)`, so they flip for free.
- **HSL bridge vars** (`--background`, `--foreground`, `--card`, `--primary`, …): add an ink
  override block so shadcn-style `bg-card` / `text-foreground` utilities flip too.
- **De-hardcode warm-white literals:** the `rgba(234,230,221,…)` values baked into `.rs-input`
  fill, `.rs-skeleton`, scrollbar, `.rs-btn-ghost` hover, focus glow → promote to tokens
  (e.g. `--hairline`, `--fill-subtle`, `--fill-subtle-hover`) defined per theme so they invert.
- **`color-scheme`** on `html` flips per theme (paper → `light`, ink → `dark`) for native controls.
- `status-dot`, `badge-*` semantic colors: verify each reads acceptably on paper; retune the
  tint/border alphas per theme only where a badge becomes illegible on white.

### 2. `frontend/src/app/layout.tsx` — pre-paint script
- Add an inline `<script>` (via `dangerouslySetInnerHTML` or a small inline string) in the
  document head that applies the saved theme before paint.
- `<body>` currently hardcodes `selection:bg-sky-500/20` etc.; keep (sky is theme-aware now) and
  ensure `backgroundColor` uses the token (already `var(--surface-base)`).

### 3. `frontend/src/lib/use-theme.ts` — new hook
- `useTheme(): { theme: 'paper' | 'ink', setTheme, toggle }`.
- Initial read: `localStorage.theme` → else `matchMedia('(prefers-color-scheme: dark)')`.
- `setTheme` writes `localStorage` + `document.documentElement.dataset.theme`.
- Listens to OS changes only while no saved preference exists.

### 4. `frontend/src/components/theme-toggle.tsx` — new component
- Compact paper/ink switch — institutional styling (mono "PAPER · INK" or sun/moon), sharp 2px,
  no glow, reduced-motion-safe, accessible (`aria-pressed` / `aria-label`).
- Uses `useTheme`.

### 5. `frontend/src/components/topbar.tsx` — placement
- Mount `<ThemeToggle/>` on the right side of the topbar (app screens).

### 6. `frontend/src/app/page.tsx` — landing nav placement + full sweep
- Mount `<ThemeToggle/>` in the sticky landing nav (landing has no topbar).
- Full paper sweep of its 72 hardcoded dark utilities + dark hero so it renders correctly in
  both themes (per decision: landing gets the full flip, done last).

### 7. The per-screen sweep (the long tail)
For each screen, replace dark-assuming literals with theme-aware tokens:
- **~180 gray utilities** (`text-zinc-400/500/300`, `bg-zinc-*`, `border-zinc-*`) → token-backed
  classes / arbitrary `var(--text-*)` values.
- **~40 inline `rgba(255,255,255,…)`** strokes/fills → `var(--hairline)`-style tokens.
- **~40 hardcoded chart hex** in Recharts components (`trends-chart`, `mini-activity-chart`,
  `trends-heatmap`, `trends-reviews`, `trends-type-breakdown`, `review-intelligence`,
  `battle-card`): line/bar/area fills, grid lines, axis ticks, tooltip surfaces, and dark canvas
  fills (`#0e1628`, `#070b14`, `#0a0a0f`) read theme colors via `useTheme` (or CSS vars). Fiddliest part.

**Screen order (foundation first, public last):**
dashboard → competitors + detail → trends (charts) → queue / settings / intel feed →
auth / login → **landing + share (last)**.

---

## Phasing

- **Phase 1 — Foundation:** token restructure + pre-paint script + `useTheme` + `ThemeToggle` +
  topbar/landing-nav placement. Exit check: toggle flips the whole app live, ink is byte-identical
  to today, OS default works on a fresh profile, no FOUC.
- **Phase 2 — Sweep:** per-screen de-hardcoding in the order above, charts included, landing last.
- **Phase 3 — QA + ship:** both themes every screen, WCAG contrast, reduced-motion, responsive;
  branch, verify, deploy via push-to-`main`.

Foundation is verified before the sweep so screen work never rests on shaky tokens.

---

## Risks & Mitigations

- **FOUC** on saved-pref load → blocking pre-paint script; OS default handled by CSS media query,
  not JS.
- **Charts** assume a dark canvas → centralize chart colors behind the theme so fills/grids/axes
  invert; this is the highest-effort, highest-bug-risk area — QA each chart in both themes.
- **Contrast regressions** (slate-blue + muted grays on white) → darker paper accent; verify WCAG
  AA on text and interactive elements.
- **Ink drift** (accidentally changing the dark look) → move ink values verbatim; visually diff the
  ink theme against current production before merge.
- **Custom Next fork** (`frontend/AGENTS.md`: "this is NOT the Next.js you know") → read the
  relevant guide under `node_modules/next/dist/docs/` before touching `layout.tsx` / script injection.

---

## Success Criteria

1. Fresh visitor with light OS sees paper; with dark OS sees ink — no flash either way.
2. Toggling persists across reloads and overrides OS.
3. Ink theme is visually identical to current production.
4. Paper renders correctly on every screen incl. all charts, landing, and share.
5. WCAG AA contrast holds in both themes; reduced-motion respected; responsive intact.
6. No backend/API/data changes; existing tests still pass; build is clean.
