# AppKittie Motion Pass — Design Spec

**Date:** 2026-06-26
**Branch:** `style/design-polish` (== `origin/main` == `5ff1bca` at start)
**Status:** Direction approved by founder. Live-preview sign-off pending (the real gate).

## Goal

Add the "interactive details" the AppKittie brief always asked for and the redesign never delivered. Every past pass was a token tweak on a *static* layout, so it felt "pretty much similar" — same frozen page, new paint. This pass changes how the page **behaves**, not how it looks frozen. Landing first; the app interior follows in the same language.

## Grounding — why these motions, not others

Captured appkittie.com's actual motion vocabulary via live browser probe (with `prefers-reduced-motion` disabled to unmask the reveals). Verified, primary-source findings:

- **No** smooth-scroll library (native scroll), **no** parallax, **no** count-ups, **no** springs/bounce, **no** marquee, **no** scroll-jacking. My untested instinct would have added several of these — they would have been wrong.
- The "alive" feel = **restraint + one loud idea**: an ambient accent glow that *pulses* behind an otherwise **static** hero product frame.
- Motion stack: Framer Motion (`motion/react`) `whileInView` `once` for scroll reveals; Tailwind keyframe utilities for ambient/hover glows; `prefers-reduced-motion` fully gated.

This maps cleanly onto our system: `--duration-slow: 240ms` + `--ease-out` ≈ their ~250–300ms ease-out; `motion/react` is already in our stack; "no spring/bounce" is already our design rule.

## Scope — Landing (this pass)

`frontend/src/app/page.tsx` is a server component with **zero** motion today. Five motions:

1. **Scroll-reveal fade-rise** *(core change)* — each section: `opacity 0→1` + `translateY(12px→0)`, ~240ms `--ease-out`, Framer Motion `whileInView` `{ once: true }`. Card grids / rows stagger (~60–80ms).
2. **Living product-panel glow** — the static radial glow behind `ProductPanel` (page.tsx ~L88–91) becomes a slow breathing pulse in `--primary`, plus a 1px primary ring on the frame. **Theme-adaptive (founder decision):** full bloom on dark; a tighter, restrained halo on light that leans on the ring + crisp shadow. Pulse verified in **both** themes.
3. **Feature-card hover reward** — how-it-works cards (page.tsx ~L222): replace the lone `hover:-translate-y-1` with a subtle lift **+ border igniting to `--primary`** (~200–300ms). AppKittie's primary hover signature.
4. **Sticky frosted-glass nav** — nav (page.tsx ~L165) goes `sticky top-0` with translucent bg + `backdrop-blur(12px)` + hairline, keeping the "Start free" CTA in reach.
5. **Reduced-motion gating (mandatory)** — `prefers-reduced-motion: reduce` disables reveals (render at rest `opacity:1; transform:none`) and the glow pulse; static glow + layout unaffected.

**Deliberately excluded** (decisions, not oversights): parallax, count-ups on landing, scroll-jacking, springy easing, hero entrance animation (AppKittie's hero is static by design — impact comes from scale + accent, not motion).

## Scope — Interior (next pass, after landing sign-off)

AppKittie has no interior, so port the *language*, not specific motions:

- Section reveal-on-load for dashboard / battlecards / trends (some infra exists: `dashboard-animator.tsx`).
- Count-ups on stat numbers (existing `count-up.tsx`) — interior-only; our established pattern, not an AppKittie import.
- Hover rewards on stat / competitor cards, consistent with the landing card hover.
- Keep it subtle — the interior is a tool, not a pitch.

## Technical approach

- **Client boundaries:** landing stays a server component; extract animated pieces into thin `'use client'` wrappers (a small `Reveal` component + a sticky-nav client wrapper). Do **not** convert the whole page to client.
- **Tokens only:** durations/easings from `--duration-* / --ease-*`; glow from `--primary`. No raw hex, no new magic numbers where a token exists.
- **Non-standard Next.js:** `frontend/AGENTS.md` warns this Next.js has breaking changes — read `node_modules/next/dist/docs/` before writing the motion/client code.
- **Reuse first:** check `frontend/src/lib/animations.ts` for an existing reveal variant before adding one.

## Verification — the real sign-off

1. Build on `style/design-polish`, run the dev server, founder **feels** the motion. *This is the gate — not this doc.*
2. After approval: deploy and verify on the **bare** prod URL (no `?cb` cache-bust — that caused a false "looks identical" alarm before), **both themes**, hard-refresh. Confirm the light-mode glow pulse specifically.
3. Reduced-motion: emulate `prefers-reduced-motion: reduce`, confirm reveals + pulse are gated.

## Out of scope

Backend, copy, new sections, layout/structure changes (motion only), interior motion (separate pass).
