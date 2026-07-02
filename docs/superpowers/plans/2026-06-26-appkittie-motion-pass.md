# AppKittie Motion Pass (Landing) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) or superpowers:subagent-driven-development to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add AppKittie's verified motion vocabulary to the (currently 100% static) landing — scroll-reveal fade-rise, a living theme-adaptive product-panel glow, a feature-card border-ignite hover, and a sticky nav — by *reusing* existing motion infra, not inventing it.

**Architecture:** The landing (`app/page.tsx`) stays a server component. One thin `'use client'` `Reveal` wrapper (reusing the shared `fadeUpVariants`/`staggerContainerVariants` already in `lib/animations.ts`) carries the scroll reveals; the glow pulse is an opacity-only CSS keyframe in `globals.css`; the sticky nav + card hover are pure CSS class changes. No new dependencies, no whole-component rewrites.

**Tech Stack:** Next 16.2.7 (App Router, React 19) · Framer Motion (`motion/react` v12) · Tailwind v4 · CSS-var design tokens.

## Global Constraints (from DESIGN.md — every task obeys these)

- **Animate `transform`/`opacity` only. No spring/bounce. No `transition: all`** (name properties explicitly).
- Durations from tokens: `--duration-fast 100ms` / `--duration-base 160ms` / `--duration-slow 240ms`. Reveal easing `--ease-smooth: cubic-bezier(0.16,1,0.3,1)`.
- **No glassmorphism** → sticky nav is a near-opaque surface + hairline, NOT frosted glass / backdrop-blur.
- `prefers-reduced-motion: reduce` already handled globally in `globals.css` (forces inline `opacity:0` visible + collapses animations) and in the `layout.tsx` `<noscript>`. Reuse it — do not add per-component guards for the reveals.
- No raw hex; no raw blue outside `--primary`. Theme-aware (dark default + light) — verify BOTH.
- Hover gives NO shadow change (`--shadow-card-hover` ≈ flat); hover feedback = transform + border-color only.

## Reference reality (verified this session)

- Lenis is **orphaned** (0 refs in `src`; dead CSS in globals.css L517–541 + unused dep). Current scroll is native `scroll-behavior: smooth`. Do not add/rewire Lenis. (Dead-CSS cleanup is out of scope.)
- `product-demo.tsx` / `how-it-works-panels.tsx` are **orphaned** but proven — reuse their *patterns* (two-layer radial glow for light-theme legibility; `fadeUpVariants`), do not rewire the components.
- Verify on the **bare** prod URL (no `?cb`), hard-refresh, both themes — prior false "looks identical" alarms came from cache-busted checks.

---

### Task 1: `Reveal` scroll-reveal client wrapper

**Files:**
- Create: `frontend/src/components/reveal.tsx`
- Reuse (no change): `frontend/src/lib/animations.ts` (`fadeUpVariants`, `staggerContainerVariants`)

**Interfaces — Produces:**
- `Reveal({ children, className?, delay? })` — single fade-rise on enter-view.
- `RevealGroup({ children, className? })` + `RevealItem({ children, className? })` — staggered group (children rise in sequence).

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { fadeUpVariants, staggerContainerVariants } from '@/lib/animations';

// Thin scroll-reveal wrappers for the server-component landing. Reuses the
// shared variants in lib/animations.ts so timing/easing stay consistent
// (fade + rise, --ease-smooth, no bounce — DESIGN.md compliant). Reduced
// motion is handled globally in globals.css, so no per-instance guard here.

const VIEWPORT = { once: true, margin: '0px 0px -80px 0px' } as const;

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={fadeUpVariants}
      custom={delay}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
    >
      {children}
    </motion.div>
  );
}

export function RevealGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={staggerContainerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  // No initial/whileInView: inherits the parent RevealGroup's state and staggers.
  return (
    <motion.div className={className} variants={fadeUpVariants}>
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Typecheck/build the new module**

Run: `cd frontend && npx tsc --noEmit` (or `npm run build`)
Expected: no type errors referencing `reveal.tsx`. (No unit test — no frontend test runner exists; this is a presentational wrapper verified visually in Task 2.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/reveal.tsx
git commit -m "feat(landing): Reveal scroll-reveal wrappers (reuse fadeUpVariants)"
```

---

### Task 2: Apply scroll-reveals to landing sections (the core change)

**Files:**
- Modify: `frontend/src/app/page.tsx` (wrap sections; `import { Reveal, RevealGroup, RevealItem } from '@/components/reveal'`)

**Interfaces — Consumes:** `Reveal` / `RevealGroup` / `RevealItem` from Task 1.

- [ ] **Step 1: Wrap each below-the-fold section in `<Reveal>`**

In `page.tsx`, wrap these section blocks so each fades-rises once on scroll-in (page.tsx stays a server component — it renders the client `Reveal` as a child):
- Trust strip (`<section className="border-y ...">`, ~L206)
- How-it-works heading + cards (~L216): heading in a `<Reveal>`; the 3-card grid as `<RevealGroup className="...sm:grid-cols-3">` with each card wrapped in `<RevealItem>` (staggered).
- Product / battle-card section (~L234): wrap the left copy column and `<LandingBattleCard />` each in `<Reveal>`.
- Pricing section (~L250): wrap `<PricingBasic />` in `<Reveal>`.
- CTA closer (~L255): wrap in `<Reveal>`.

Leave the hero (header, ~L184) and nav as-is — AppKittie's hero is intentionally static (impact = scale + accent, not entrance motion).

- [ ] **Step 2: Verify reveals on the dev server**

Run: `cd frontend && npm run dev` → open `http://localhost:3000`, scroll.
Expected: each section fades up ~16px once as it enters; hero is immediate; no layout shift; no horizontal scroll.

- [ ] **Step 3: Verify reduced-motion gate**

In devtools (Rendering ▸ Emulate `prefers-reduced-motion: reduce`), hard-reload.
Expected: all sections render immediately at full opacity (no blank/invisible content) — the global override holds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat(landing): scroll-reveal fade-rise on all sections (static -> alive)"
```

---

### Task 3: Living product-panel glow (theme-adaptive, opacity-only pulse)

**Files:**
- Modify: `frontend/src/app/globals.css` (add `@keyframes glow-breathe` + `.glow-breathe`)
- Modify: `frontend/src/app/page.tsx` (`ProductPanel` glow div, ~L88–91)

- [ ] **Step 1: Add the opacity-only breathe keyframe to globals.css**

Add near the other keyframes (after the `fadeIn` block, ~L484):

```css
/* Ambient product-panel glow — slow opacity "breath" (AppKittie signature,
   recolored to --primary). Opacity-only per DESIGN.md; the global
   prefers-reduced-motion rule freezes it for motion-sensitive users. */
@keyframes glow-breathe {
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 1; }
}
.glow-breathe { animation: glow-breathe 6s ease-in-out infinite; }
```

- [ ] **Step 2: Upgrade the ProductPanel glow to two-layer + theme-adaptive + breathe**

Replace the single-layer static glow div in `ProductPanel` (page.tsx ~L88–91) with a two-radial-layer halo (the `product-demo.tsx` legibility technique so it reads on light, not just dark), carrying the `glow-breathe` class, tokenized (`color-mix(... var(--primary) ...)`, no hex):

```tsx
<div
  aria-hidden
  className="glow-breathe pointer-events-none absolute left-1/2 top-[-8%] h-[86%] w-[88%] -translate-x-1/2 opacity-80 dark:opacity-100"
  style={{
    background:
      'radial-gradient(58% 56% at 50% 42%, color-mix(in oklab, var(--primary) 40%, transparent), transparent 70%), radial-gradient(40% 42% at 50% 40%, color-mix(in oklab, var(--primary) 30%, transparent), transparent 76%)',
    filter: 'blur(36px)',
  }}
/>
```

Founder decision = **adapt per theme**: dark = full bloom (`opacity-100`); light = restrained (`opacity-80`, tune down further if muddy). Exact light alpha/blur tuned live in Step 3.

- [ ] **Step 3: Verify the glow in BOTH themes (the founder's explicit gate)**

Dev server, toggle theme. Expected: dark = clear blue bloom that gently breathes behind the frame; light = a soft, clean halo that reads without graying/muddying the panel. If light looks muddy, lower `opacity-*` / reduce `--primary` mix % on the light layers (or drop the pulse to dark-only by gating `.glow-breathe` under `.dark`). Re-verify reduced-motion freezes the pulse.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/globals.css frontend/src/app/page.tsx
git commit -m "feat(landing): living theme-adaptive product-panel glow (opacity breathe)"
```

---

### Task 4: Sticky nav (no-glassmorphism) + feature-card border-ignite hover

**Files:**
- Modify: `frontend/src/app/page.tsx` (nav ~L165; feature card ~L222)

- [ ] **Step 1: Make the nav sticky with a near-opaque surface + hairline**

Change the nav (page.tsx ~L165) from `relative` to sticky, extending the bg to the container edges and adding a bottom hairline. NO `backdrop-blur` (no-glassmorphism rule):

```tsx
<nav className="sticky top-0 z-50 -mx-6 flex h-16 items-center justify-between border-b border-border bg-background/92 px-6">
```

(Alpha `/92` = near-opaque; tune `/88–/95` live. If text bleed-through shows, go solid `bg-background`.)

- [ ] **Step 2: Add border-ignite to the feature cards**

Change the how-it-works card (page.tsx ~L222) to transition transform + border-color explicitly (not `all`), keep the existing lift, add border→primary on hover, no shadow change:

```tsx
<div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition-[transform,border-color] duration-200 ease-out hover:-translate-y-1 hover:border-primary/40">
```

- [ ] **Step 3: Verify sticky + hover, both themes**

Dev server: scroll — nav pins to top with a clean opaque bar + hairline (not glassy), "Start free" stays reachable. Hover a feature card — subtle lift + border lights to blue, no shadow jump. Check both themes.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat(landing): sticky nav (opaque, no-glass) + feature-card border-ignite hover"
```

---

### Task 5: Full verification & founder sign-off (the real gate)

- [ ] **Step 1:** `cd frontend && npm run build` — clean build, no type/lint errors.
- [ ] **Step 2:** Dev server walkthrough top-to-bottom — founder **feels** the motion. Iterate on timing/glow live until it lands. (This is the sign-off, not the spec/plan.)
- [ ] **Step 3:** Reduced-motion emulation: every section visible, no pulse, no reveals — nothing blank.
- [ ] **Step 4:** After founder yes → commit, push `style/design-polish` → deploy. Verify on the **bare** prod URL (`https://rivalscope.dev`, no `?cb`), hard-refresh, **both themes**: reveals fire, glow breathes + reads on light, nav sticky, card hover ignites.
- [ ] **Step 5:** Memory: record the verified AppKittie motion vocabulary + the no-glassmorphism/opacity-only adaptations (Octarin `memory_add`, repo `competitor-analyzer`), and update the auto-memory handoff.

## Self-review (against the spec)

- Spec's 5 motions → Tasks 2 (reveal), 3 (glow), 4 (sticky + hover), global reduced-motion (reused). ✓
- Light-theme glow decision (adapt per theme) → Task 3 Steps 2–3. ✓
- Technical approach (server component + thin client wrapper, tokens, reuse `animations.ts`, read-next-docs caveat in AGENTS.md) → Task 1 + Architecture. ✓
- No placeholders; types consistent (`Reveal`/`RevealGroup`/`RevealItem` defined Task 1, consumed Task 2). ✓
- Out of scope (interior motion, Lenis cleanup, structural change) honored. Interior is the next pass after this ships.

## Next pass (not this plan)

Interior motion in the same language: section reveal-on-load (dashboard/battlecards/trends; `dashboard-animator.tsx` exists), count-ups on stat numbers (`count-up.tsx`, interior-only), consistent card hover. Subtle — it's a tool, not a pitch.
