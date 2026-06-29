# Landing — CTA unification + polish pass (design)

**Date:** 2026-06-29
**Branch:** `feat/landing-sections-redesign` (PR #34)
**Status:** approved (decisions A–D + CTA direction confirmed by user 2026-06-29)

## Context

The committed landing redesign (4 sections rebuilt to the serious Linear/Vercel register) is solid and ships as-is in spirit — monochrome zinc, single blue accent, Geist type, clean light/dark parity, clean mobile stacking, zero console errors. A full visual audit in both themes (dark/light desktop + mobile, captured via `browse` with reveals fired) confirmed **no rebuild is warranted.** This pass fixes a small set of objective defects found during that audit, plus lands in-flight depth work.

Every change below is justified by an objective defect (consistency, WCAG, dead code) or a concrete match to the north-star references (Linear/Vercel) — not by taste.

### Non-finding (verified, do not act on)
A full-page screenshot showed sections below the hero blank. This is a **screenshot-harness artifact**, not a user bug: the `Reveal` wrapper (`components/reveal.tsx`) uses Framer Motion `whileInView` (`once: true`); a static capture that ends with `scrollTo(0,0)` cancels pending reveal callbacks. Scrolling a section to viewport center and waiting ~1s fires it (verified: stuck count 8 → 0 on continuous scroll). Real continuous user scroll is unaffected. **No change needed.**

## Changes

### A. Unify the primary CTA → flat monochrome foreground-fill

**Problem (objective):** "Start free" renders in three structurally different treatments on one page:
- Nav + Hero → flat `bg-foreground` pill (monochrome)
- Pricing "SaaS Starter" (highlighted) → flat `bg-primary` blue rectangle
- Final CTA (`cta-closer`) → blue **gradient** pill **with a colored glow shadow** (`Button variant="cta"`)

The glow/gradient also leans against the de-neon decision (`e45d4cf` dropped glow).

**Decision:** One primary treatment page-wide — **flat foreground-fill** (white-on-dark / black-on-light), no gradient, no glow. Closest port of Linear/Vercel (both use monochrome primaries); keeps blue as a pure signal color per DESIGN.md accent discipline.

**Implementation:**
- Redefine the `cta` variant in `components/ui/button.tsx`: flat `bg-foreground text-background`, `rounded-full`, subtle opacity/brightness hover, **remove** `[background-image:var(--gradient-primary)]` and the colored `shadow-[…]` glow.
- Pricing highlighted tier button (`components/ui/pricing-demo.tsx` ~line 119–121): change the highlighted branch from `bg-primary text-primary-foreground` to the same foreground-fill. Non-highlighted tier stays outline (`border border-border`) — tier hierarchy (filled vs outline) is preserved, only the fill color changes.
- Hero + Nav "Start free" (`app/page.tsx`): already foreground-fill — leave as-is (optionally switch to `variant="cta"` for one source of truth; non-blocking).
- The highlighted pricing **card** ring/border may stay blue (`ring-primary/20`) — that is accent, not a CTA, and is in-policy.

**DESIGN.md update (required):** the line stating blue is used on "primary CTAs" must change — primary CTAs are monochrome foreground-fill; blue is reserved for links, active/selected state, focus rings, signal/live dots, and meaningful accents only. Add a 2026-06-29 row to the Decisions Log.

### B. Mobile touch targets ≥ 44px (WCAG 2.5.8 / DESIGN.md)

**Problem (objective, measured at 390px):** final-CTA "Start free"/"Book a demo" = **36px**, hero "Start free"/"Book a demo" = **41px**, footer block links = 20–28px. DESIGN.md enforces ≥44px on touch controls.

**Implementation:**
- Final CTA + hero CTA buttons (primary conversion path): ensure rendered height ≥44px on mobile (e.g. `min-h-11` / adjusted `py`). Re-measure to confirm — the fix is "verified ≥44", not a guessed class.
- Footer column nav links (`site-footer.tsx`): give standalone block links a ≥44px tap height via vertical padding. The inline legal row (Privacy/Terms/Support) is acceptable under the WCAG 2.5.8 inline-link exception; add modest padding but it is not the priority.
- Scope priority: conversion-path buttons first, footer second.

### C. Delete dead Magic UI components

**Problem (objective — dead code):** three components are committed/untracked but unused: `components/ui/border-beam.tsx`, `marquee.tsx`, `number-ticker.tsx`. `border-beam` (animated glow border) contradicts the de-neon decision; `marquee` was explicitly rejected for the logo cloud ("gimmicky for a serious tool" — see `logo-cloud.tsx` comment). User declined the one legit use (count-up stats), so `number-ticker` goes too.

**Implementation:**
- Delete all three files.
- Remove the uncommitted `@keyframes marquee` / `--animate-marquee*` additions from `globals.css` (dead — marquee is unused).
- Grep to confirm no remaining imports before deleting (only match today is the word "marquee" inside a comment).

### D. Land the kept depth work

**Keep + commit (on-brand, restrained Stripe-port depth, renders well in both themes):**
- `app/page.tsx` — hero atmospheric wash (single-accent radial, ~18% blue, restrained — not neon).
- `components/landing/product-showcase.tsx` — battle-card atmospheric backdrop + elevation shadow.

**Drop:** the `globals.css` marquee keyframes (covered by C). After C+D, `globals.css` has no net uncommitted change.

## Out of scope
Layout, type scale, section structure, hero, product panel, battle card, theme parity, copy, backend, routes/API. No new sections.

## Verification

1. `tsc --noEmit` clean; `next build` succeeds.
2. Re-capture dark + light desktop + mobile (scroll-through to fire reveals): all four primaries are flat foreground-fill, no gradient/glow; Local Business stays outline.
3. Re-measure mobile touch targets: conversion-path CTAs ≥44px.
4. `grep` confirms no imports of the deleted components; `globals.css` has no leftover marquee rules.
5. Both themes render correctly; no console errors.
6. Commit (A/B/C/D as logical commits) and update PR #34.

## Files touched
- `frontend/src/components/ui/button.tsx` (cta variant)
- `frontend/src/components/ui/pricing-demo.tsx` (highlighted CTA fill)
- `frontend/src/components/landing/cta-closer.tsx` (touch target; inherits flat cta variant)
- `frontend/src/app/page.tsx` (hero CTA touch target; keep hero wash)
- `frontend/src/components/landing/site-footer.tsx` (footer link tap height)
- `frontend/src/app/globals.css` (remove dead marquee keyframes)
- `frontend/src/components/ui/{border-beam,marquee,number-ticker}.tsx` (delete)
- `DESIGN.md` (accent-discipline line + Decisions Log)
