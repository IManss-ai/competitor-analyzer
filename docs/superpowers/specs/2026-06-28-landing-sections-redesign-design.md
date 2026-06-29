# Landing sections redesign — design spec

**Date:** 2026-06-28
**Status:** Approved (visual mockup approved 2026-06-28; this spec pending user review)
**Scope:** Rebuild the 4 landing sections below `frontend/src/app/page.tsx` to match the already-shipped serious Linear-register hero. The hero, nav, auth, and backend are **out of scope**.

## Goal

The hero was rebuilt as a faithful Linear port (monochrome, type-forward, single accent). The 4 sections below it still use the older "AppKittie-in-blue / de-neon stopgap" style (primary-tinted icon chips, `gradText` placeholder emphasis, plain-text trust strip). Rebuild them, **custom, guided by the Linear / Stripe / Vercel `DESIGN.md` references** (`docs/design-references/`), so the whole page reads as one serious B2B tool.

## Global design language (applies to all 4 sections)

- **Tokens only, no raw hex.** Zinc neutrals + single blue `--primary`, used only on CTAs, links, active/selected state, focus rings, and signal dots — **never as a decorative background wash**. (See `DESIGN.md` + `globals.css`.)
- **Type:** Geist Sans for display/UI, Geist Mono for numerals/labels/eyebrows. Display headings carry negative tracking (`tracking-[-0.02em]`), matching the hero.
- **Rhythm:** ~96px section spacing; hairline (`border-border`) dividers between sections; flat surfaces (`--shadow-card: none`), elevation only on floating overlays.
- **Motion:** `motion/react` blur-fade / fade-up reveals on scroll, reusing the existing `Reveal` / `RevealGroup` / `RevealItem` components. **No spring/bounce** — use `--duration-*` + `--ease-*`. Respect `prefers-reduced-motion`.
- **Theme-aware:** every section must render correctly in **both dark and light**.
- **Copy:** em-dash-light (commas/colons/periods). Tight, concrete, no marketing fluff.
- **No numbered `01/02/03` section markers** (flagged by `impeccable` as an AI scaffold tell) — use verb/word cadence instead.

## Tooling used (per user request to leverage the new stack)

- **ui-ux-pro-max** skill for component-level design intelligence (spacing, hierarchy, states).
- **`docs/design-references/` DESIGN.md** (linear.app, stripe, vercel) as the port sources.
- **Component registries** (Tailark/Eldora/Magic UI) as *pattern inspiration only* — this is a custom build, not block drop-in. Magic UI `marquee` may be pulled for the logo cloud if it reskins cleanly to our tokens.
- **impeccable** for craft review of each section as it's built.
- **a11y skills** (`reviewing-a11y` / `auditing-wcag`) for a contrast/focus/keyboard/reduced-motion pass after build.

## Per-section design

### 1. How it works  (replaces `FEATURES` 3-card grid, `page.tsx` ~148–235)
- **Layout:** 3-step horizontal pipeline in a hairline-bordered, divided row (stacks to 1-col on mobile). Eyebrow "How it works" + display heading ("From a dozen signals to one sales play").
- **Steps (verb labels, no numbers):** **Connect** (paste competitor URLs → auto-discover pages), **Detect** (24/7 monitoring → live intel feed), **Win** (one battle card, 5 ranked plays).
- **Each step** shows a small **real product fragment** (URL chips / mini intel-feed rows / battle-card stub), not a generic icon chip.
- **Motion:** `RevealGroup` staggered fade-up of the 3 steps.

### 2. Product showcase  (replaces 2-col `#product` section, `page.tsx` ~237–253)
- **Layout:** Linear principle — **real product UI in a framed dark panel**. Lead heading ("Every rival, on one battle card") + a browser-chrome-framed dashboard panel (reuse/extend `ProductPanel` / `LandingBattleCard`). Below it, **2 alternating feature rows** (Stripe pattern): copy paired with a framed UI fragment, sides alternating.
- **Content rows:** "Live intel feed" (categorized, timestamped changes) and "5 ranked plays per card" (from real G2/Trustpilot complaints, copy-to-clipboard).
- **No decorative glow** behind the panel — hairline border + subtle elevation only.
- **Motion:** panel fades up; rows reveal on scroll.

### 3. Pricing  (elevates `PricingBasic`, `frontend/src/components/ui/pricing-demo.tsx`)
- **Keep the just-shipped instant-pay copy** ("Run your first battle card free, no credit card", "Start free"). Do not reintroduce trial language.
- **Layout:** two hairline cards (SaaS Starter $49 / Local Business $19). **Mono numerals** for prices. SaaS tier subtly accented (hairline-accent ring, not a fill wash) with a small "Most teams" tag. Feature lists with check marks.
- **CTAs:** de-pilled to rounded-rectangle (Linear/Stripe register), `--primary` for the accented tier, ghost/outline for the other. (Note: hero CTAs are pills; pricing intentionally uses the calmer rectangle — confirm during review if full consistency is preferred.)
- **Motion:** cards fade up.

### 4. Trust + CTA + footer  (replaces trust strip ~203–213, CTA ~262–276, footer ~278–286)
- **Trust:** monochrome **logo cloud** (muted, hairline-framed) replacing the plain brand row; optional Magic UI `marquee` if it reskins to tokens cleanly, else a static flex row.
- **CTA closer:** serious centered closer — display heading (no `gradText`/gradient text), one `--primary` primary CTA + one ghost "Book a demo". No decorative background.
- **Footer:** expand minimal footer to a proper **multi-column footer** (brand blurb / Product / Company / Legal) with the existing routes (`/privacy`, `/terms`, support mailto) plus placeholder anchors for not-yet-built pages (clearly non-linking, no dead routes).

## Constraints / invariants

- shadcn primitives + CSS-var tokens; no raw hex, no raw `text-white`/`bg-white` except on verified-contrast accent surfaces; no raw blue outside `--primary`.
- Reuse existing `Reveal*` components and the `Button` primitive; don't fork new button shapes beyond the documented pricing rectangle.
- Keep the existing nav, hero, and section anchor IDs (`#how-it-works`, `#product`, `#pricing`) so nav links keep working.
- No dead links: footer placeholders for unbuilt pages must not 404.

## Out of scope

Hero, top nav, auth, backend, pricing *amounts/plans* (copy already correct), any route/page creation.

## Verification

- `frontend` production build green (`next build`), `tsc` + eslint clean.
- Renders correctly in **both dark and light**.
- a11y pass (contrast of blue-on-zinc + muted text, visible focus rings on CTAs, keyboard nav, `prefers-reduced-motion`) via the `reviewing-a11y` skill.
- `impeccable` review per section.
- Visual parity with the approved mockup; reviewed live on localhost before any deploy.
