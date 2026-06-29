# Landing — clarity-first + motion/illustration pass (design)

**Date:** 2026-06-29
**Branch:** `feat/landing-sections-redesign` (PR #34)
**Status:** approved (direction + headline + section design confirmed by user 2026-06-29)
**Supersedes nothing; builds on** the committed redesign + the CTA/polish pass (`a5061ed`…`eb7df58`).

## Problem (user feedback, verbatim intent)

A first-time visitor can't tell what Rivalscope is; the page is text-heavy, hard to read, and static (no motion/illustration). Three threads, ranked:

1. **Clarity (primary)** — the abstract H1 ("The competitive intelligence system for modern sales teams") doesn't say what it does. *This is a copy/hierarchy fix, NOT a motion fix.*
2. **Too much text** — descriptions repeat what the visuals already show.
3. **No motion / no illustration** — everything is a static mockup.

## Direction (decided)

**Blend:** product-led motion as the backbone + a little inline-SVG illustration where a concept is clearer drawn. Clarity is the load-bearing fix; motion is the garnish on top of an already-clear static page. Scope this cycle: **hero + how-it-works + product-showcase** (remaining sections follow the same pattern in later passes).

## Cross-cutting rules (apply to all three sections)

- Motion via `motion/react`. **transform/opacity only.** Within DESIGN.md budget (`--duration-fast/base/slow` = 100/160/240ms, `--ease-smooth`/`--ease-out`). **No spring/bounce, no `transition: all`.**
- **One motion idea per section.** Restrained; one pass on view; no perpetual loops (the existing `animate-pulse` live dot is the only continuous motion).
- **Reduced motion is load-bearing.** Every new reveal must render its **final resting state** under `prefers-reduced-motion: reduce` — gate with motion/react `useReducedMotion()`, do not rely solely on the globals.css `[style*="opacity:0"]` hack (it covers opacity, not `transform`). Verified with explicit reduced-motion screenshots.
- **Light illustration = inline SVG**, theme-aware (tokens, not hex). No AI art, no image assets, no asset pipeline.
- **Preserve the real product fragments** already in these sections (chips, mini intel feed, battle card, plays) — make them *move*; do not replace them with generic illustration. (They were a deliberate anti-slop choice.)
- **Accent discipline unchanged:** blue only as signal (live dot, the "5", primary numerals/badges per existing usage). No new decorative blue.

## Section 1 — Hero (`app/page.tsx`)

**Clarity (static, must pass the stranger test with motion OFF):**
- Add an **eyebrow** above the H1: `Competitive intelligence for sales teams` (mono, 11px, uppercase, `tracking-[0.16em]`, `text-muted-foreground`) — names category + audience.
- **H1** → `Track every competitor. Turn each change into a winning play.` (keep current `clamp(38px,6vw,64px)` size/weight/tracking.)
- **Subhead** → `Pricing, messaging and hiring, watched around the clock and compiled into ranked sales plays your reps can send.`
- Keep the "New · Auto-generated battle cards" link and the CTA row unchanged.

**Motion (one idea — "the dashboard is live"):**
- The ProductPanel **intel feed rows stream in** on view (stagger, fade+rise, ≤240ms each, ~70ms stagger).
- The four stat numbers (12 / 47 / 8 / 5) **count up** on view — re-introduce a minimal `CountUp` (small client component/hook using motion/react; `tabular-nums`; `useReducedMotion()` → render final value instantly). (Replaces the deleted `number-ticker`; this is now a justified use.)
- Live dot keeps its existing pulse. No perpetual feed loop.
- Reduced motion: feed rows + final numbers shown immediately.

## Section 2 — How it works (`components/landing/how-it-works.tsx`)

**Cut text (measurable):** each step's `desc` cut to **≤6 words** (the title + fragment carry the meaning). Example copy (final wording in plan):
- Connect / "Add your rivals" → `Paste URLs — we map the rest.`
- Detect / "We watch, around the clock" → `Every change, the moment it lands.`
- Win / "Get the play" → `One card. Five ranked plays.`

**Light illustration:** a horizontal **flow line** Connect → Detect → Win (inline SVG, `stroke=var(--border)` with a `var(--primary)` progress segment) that **draws in** on view (animate `pathLength`/stroke-dashoffset). On mobile (stacked), the flow line is **hidden** (steps stack vertically; never a broken/half-drawn line).

**Motion (one idea — "pipeline activates"):** as the line reaches each step, that step's fragment animates in (Detect's mini feed streams its rows; Win's "5 / Battle card ready" appears). Reuse `RevealGroup`/`RevealItem` stagger where possible. Reduced motion: line fully drawn + all fragments shown static.

## Section 3 — Product showcase (`components/landing/product-showcase.tsx`)

**Cut text (measurable):**
- Subhead (current line 77–79) → one line: `Every change, complaint and signal — compiled into one card your reps can act on.`
- Row 1 "A live intel feed" desc (line 59) → `Every change, categorized and timestamped.`
- Row 2 "Five ranked plays per card" desc (line 64) → `Pulled from real complaints, ordered by what closes.`

**Motion (one idea — "the card assembles"):** the battle card (`components/landing-battlecard.tsx`) quadrants (detected changes / complaints / signals / plays) **fade+rise in sequence on view — fast and subtle, one pass, ~180ms each.** Explicitly NOT a slow dramatic build (highest gimmick risk). The two row UI minis stream/stack their rows. Keep the existing depth backdrop + shadow. Reduced motion: card fully shown, no sequence.

## Out of scope
Pricing, logo-cloud, CTA-closer, footer, nav (those follow in later passes). Backend, routes, `/api/v1/*`. No new external dependencies (motion/react already present).

## Verification
1. **Stranger test, reduced-motion ON:** load hero with `prefers-reduced-motion: reduce` emulated — a stranger can state what Rivalscope does from the static hero alone.
2. **Reduced-motion screenshots** of all three sections show the final resting state (no blank, no pre-transform offset).
3. **Motion screenshots** (scroll-through) show feed stream, count-ups landed, pipeline drawn, card assembled.
4. Text cuts verified: how-it-works captions ≤6 words; product-showcase row descs one line.
5. `tsc --noEmit` clean; `next build` green; both themes correct; no console errors.
6. Re-measure: no regression to the 44px touch targets or mono CTAs from the prior pass.

## Files touched
- `frontend/src/app/page.tsx` (hero eyebrow/H1/subhead; ProductPanel feed stream + stat count-ups)
- `frontend/src/components/landing/how-it-works.tsx` (caption cuts; SVG flow line; fragment activation)
- `frontend/src/components/landing/product-showcase.tsx` (text cuts; row mini motion)
- `frontend/src/components/landing-battlecard.tsx` (quadrant assemble motion — inspect first)
- `frontend/src/lib/animations.ts` (variants; reduced-motion-safe; add stream/path-draw variants as needed)
- `frontend/src/components/reveal.tsx` (ensure `useReducedMotion()` final-state guarantee)
- New: a minimal `CountUp` component (e.g. `frontend/src/components/ui/count-up.tsx`)
