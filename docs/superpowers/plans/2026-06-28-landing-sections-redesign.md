# Landing Sections Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, recommended for cross-section visual consistency) to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Rebuild the 4 landing sections below the hero (How it works, Product showcase, Pricing, Trust+CTA+footer) to match the shipped Linear-register hero.

**Architecture:** Extract each rebuilt section into a focused component under `frontend/src/components/landing/`, then slot them into `frontend/src/app/page.tsx` (replacing the inline de-neon-stopgap markup). Pricing is elevated in place in `pricing-demo.tsx`. All styling via existing CSS-var tokens + shadcn primitives; reveals via the existing `Reveal*` components.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui, `motion/react`, Geist Sans/Mono, lucide-react.

## Global Constraints (verbatim from spec — apply to every task)

- Tokens only, **no raw hex**; zinc + single `--primary`, never a decorative background wash; no raw `text-white`/`bg-white` except verified-contrast accent surfaces; no raw blue outside `--primary`.
- Geist Sans display + Geist Mono numerals/eyebrows; display headings `tracking-[-0.02em]`.
- ~96px section rhythm; `border-border` hairline dividers; flat surfaces (`--shadow-card: none`).
- Motion = `motion/react` blur-fade / fade-up via existing `Reveal`/`RevealGroup`/`RevealItem`; **no spring/bounce**; respect `prefers-reduced-motion`.
- Render correctly in **both dark and light**.
- Copy is **em-dash-light**; **no `01/02/03` numbered markers**.
- Keep nav anchor IDs `#how-it-works`, `#product`, `#pricing`. No dead links.
- Reuse existing `Button` primitive; only new shape allowed = rectangular pricing CTA.

## File Structure

- Create `frontend/src/components/landing/how-it-works.tsx` — §1 3-step pipeline.
- Create `frontend/src/components/landing/product-showcase.tsx` — §2 framed UI + alternating rows.
- Create `frontend/src/components/landing/logo-cloud.tsx` — §4 trust strip.
- Create `frontend/src/components/landing/cta-closer.tsx` — §4 closer.
- Create `frontend/src/components/landing/site-footer.tsx` — §4 multi-column footer.
- Modify `frontend/src/components/ui/pricing-demo.tsx` — §3 elevation in place.
- Modify `frontend/src/app/page.tsx` — import + slot new components; delete replaced inline markup (`FEATURES`, `FeatureBullet`, `Avatars` if unused, `gradText`, old `#product`/trust/CTA/footer blocks; keep `ProductPanel` — reused by §2).

Verification commands (used by every task):
- Build/type: `cd frontend && npx tsc --noEmit` then `npm run build` (or `npx next build`).
- Visual: dev server on :3000, view `/` in dark + light (toggle).
- Craft: `/impeccable` review of the changed file(s).
- a11y (final): `reviewing-a11y` skill pass.

---

### Task 1: How it works — 3-step pipeline

**Files:**
- Create: `frontend/src/components/landing/how-it-works.tsx`
- Modify: `frontend/src/app/page.tsx` (replace `#how-it-works` section + remove `FEATURES`/`FeatureBullet` if unused there)

**Interfaces:**
- Produces: `export function HowItWorks()` — self-contained `<section id="how-it-works">`.
- Consumes: `Reveal`, `RevealGroup`, `RevealItem` from `@/components/reveal`; lucide icons.

- [ ] **Step 1: Consult design intelligence**

Invoke `ui-ux-pro-max` for a 3-step "process pipeline" pattern on Next.js/Tailwind/shadcn; cross-check `docs/design-references/linear.app/DESIGN.md` (step cadence, hairline dividers, mono labels).

- [ ] **Step 2: Build the component**

Structure (real classes/tokens; refine copy live):
```tsx
// eyebrow (mono) + display heading, then a hairline-bordered 3-col grid
// that stacks to 1-col on mobile. Each step: word label (Connect/Detect/Win),
// h3 title, muted desc, and a small REAL product fragment (not a generic icon).
<section id="how-it-works" className="scroll-mt-20 border-t border-border py-24">
  <Reveal>
    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">How it works</p>
    <h2 className="mt-3 max-w-[20ch] font-display text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.08] tracking-[-0.02em]">
      From a dozen signals to one sales play.
    </h2>
  </Reveal>
  <RevealGroup className="mt-12 grid overflow-hidden rounded-xl border border-border sm:grid-cols-3">
    {/* 3 RevealItem steps; each: border-r border-border (last:border-r-0), p-7;
        label = text-primary font-medium; fragment = hairline mini-UI using
        existing FEED-style rows / chips. No 01/02/03. */}
  </RevealGroup>
</section>
```
Fragments: Connect = URL chips; Detect = 2 mini intel-feed rows (reuse `Badge`/`FEED` shapes from page.tsx — move shared bits in if needed); Win = battle-card stub line with a `--primary` live dot.

- [ ] **Step 3: Wire into page.tsx**

Replace the existing `#how-it-works` block with `<HowItWorks />`; remove now-unused `FEATURES`/`FeatureBullet`.

- [ ] **Step 4: Verify build + render**

`cd frontend && npx tsc --noEmit && npm run build` → expect success. Dev: view `/` dark + light; confirm steps stack on mobile, accent only on labels/dot.

- [ ] **Step 5: impeccable review** — `/impeccable` on `how-it-works.tsx`; fix real findings (watch the numbered-marker + em-dash rules).

- [ ] **Step 6: Commit**
```bash
git add frontend/src/components/landing/how-it-works.tsx frontend/src/app/page.tsx
git commit -m "feat(landing): rebuild How-it-works as 3-step pipeline (Linear register)"
```

---

### Task 2: Product showcase — framed UI + alternating rows

**Files:**
- Create: `frontend/src/components/landing/product-showcase.tsx`
- Modify: `frontend/src/app/page.tsx` (replace `#product` section)

**Interfaces:**
- Produces: `export function ProductShowcase()` — `<section id="product">`.
- Consumes: existing `ProductPanel` (keep in page.tsx or move into this file), `LandingBattleCard`, `Reveal`.

- [ ] **Step 1: Design intelligence** — `ui-ux-pro-max` "feature rows / framed product" pattern; cross-check `docs/design-references/stripe/DESIGN.md` + `vercel/DESIGN.md` (alternating rows, framed panels, no glow).

- [ ] **Step 2: Build the component**
```tsx
// Lead: eyebrow + heading "Every rival, on one battle card."
// Framed panel: reuse <ProductPanel/> (already a browser-style frame) WITHOUT the
//   accent glow — remove any --gradient/glow background; hairline border + subtle
//   --shadow-elevated only.
// Then 2 alternating rows (md:grid-cols-2, reverse order-1/order-2 on the 2nd):
//   each = copy (h3 + muted p) paired with a framed UI fragment (LandingBattleCard
//   excerpt / intel-feed mini). Rows separated by hairline.
```

- [ ] **Step 3: De-glow ProductPanel** — remove decorative glow/gradient background behind the panel (spec: no decorative wash); keep frame + hairline.

- [ ] **Step 4: Wire into page.tsx** — replace `#product` block with `<ProductShowcase />`.

- [ ] **Step 5: Verify build + render** — tsc + build green; dark + light; panel readable, rows alternate, no glow.

- [ ] **Step 6: impeccable review** — fix findings.

- [ ] **Step 7: Commit**
```bash
git add frontend/src/components/landing/product-showcase.tsx frontend/src/app/page.tsx
git commit -m "feat(landing): rebuild Product showcase as framed UI + alternating rows"
```

---

### Task 3: Pricing — elevate in place

**Files:**
- Modify: `frontend/src/components/ui/pricing-demo.tsx`

**Interfaces:**
- Produces: same `export { PricingBasic }` (no signature change; page.tsx already imports it).

- [ ] **Step 1: Design intelligence** — `ui-ux-pro-max` "pricing cards" + `docs/design-references/stripe/DESIGN.md` (hairline cards, mono numerals, restrained accent).

- [ ] **Step 2: Elevate the cards**
  - Prices → Geist Mono, `tabular-nums`, large with negative tracking.
  - Cards → hairline `border-border`, flat; SaaS tier gets an accent ring (`ring-1 ring-primary/30` or `border-primary/40`) + small "Most teams" mono tag — **not** a fill wash.
  - CTAs → rectangular (`rounded-lg`, not `rounded-full`): SaaS = `bg-primary text-primary-foreground`, Local = outline/ghost. Keep existing instant-pay copy ("Start free", "first battle card free, no credit card") verbatim.
  - Keep both-theme correctness; no raw hex.

- [ ] **Step 3: Verify build + render** — tsc + build green; dark + light; mono prices, one tier accented, rectangular CTAs.

- [ ] **Step 4: impeccable review** — fix findings.

- [ ] **Step 5: Commit**
```bash
git add frontend/src/components/ui/pricing-demo.tsx
git commit -m "feat(landing): elevate pricing to hairline cards + mono numerals"
```

---

### Task 4: Trust + CTA + footer

**Files:**
- Create: `frontend/src/components/landing/logo-cloud.tsx`, `cta-closer.tsx`, `site-footer.tsx`
- Modify: `frontend/src/app/page.tsx` (replace trust strip, CTA closer, footer; remove `gradText`)

**Interfaces:**
- Produces: `LogoCloud()`, `CtaCloser()`, `SiteFooter()`.
- Consumes: `Reveal`, `Button`, `Link`.

- [ ] **Step 1: Design intelligence** — `ui-ux-pro-max` "logo cloud / final CTA / footer" + `docs/design-references/vercel/DESIGN.md`.

- [ ] **Step 2: Build LogoCloud** — muted monochrome row (or Magic UI `marquee` ONLY if it reskins cleanly to tokens; else static flex), mono eyebrow above. Brands: Stripe, Linear, Notion, Figma, Vercel, Ramp.

- [ ] **Step 3: Build CtaCloser** — centered display heading (no `gradText`/gradient), muted subhead, `Button variant="cta"` primary + outline "Book a demo". No decorative bg.

- [ ] **Step 4: Build SiteFooter** — 4-col grid (brand blurb / Product / Company / Legal). Real routes: `/privacy`, `/terms`, `mailto:support@rivalscope.dev`, `#how-it-works`, `#pricing`. Unbuilt pages → non-linking `<span>` (no 404). `© 2026 Rivalscope`.

- [ ] **Step 5: Wire into page.tsx** — replace the 3 blocks; remove `gradText` const + any now-unused imports.

- [ ] **Step 6: Verify build + render** — tsc + build green; dark + light; footer columns wrap on mobile, no dead links.

- [ ] **Step 7: impeccable review** — fix findings.

- [ ] **Step 8: Commit**
```bash
git add frontend/src/components/landing/ frontend/src/app/page.tsx
git commit -m "feat(landing): rebuild trust strip, CTA closer, multi-column footer"
```

---

### Task 5: Full-page integration verification

**Files:** none new (verification + fixups only).

- [ ] **Step 1: Full build** — `cd frontend && npx tsc --noEmit && npm run build` → green. Resolve any unused-import/lint errors from removed inline blocks.

- [ ] **Step 2: Live review both themes** — dev server; scroll whole page in dark + light; confirm visual parity with the approved mockup and that the 4 sections cohere with the hero (rhythm, type, accent discipline).

- [ ] **Step 3: a11y pass** — invoke `reviewing-a11y`: blue-on-zinc + muted-text contrast, visible focus rings on all CTAs/links, keyboard nav, `prefers-reduced-motion` disables reveals. Fix issues.

- [ ] **Step 4: Restart visual companion + user review** — bring the browser back (same `--project-dir`), show the live page; get user sign-off before any deploy.

- [ ] **Step 5: Commit any fixups**
```bash
git add -A frontend/
git commit -m "fix(landing): a11y + integration fixups for rebuilt sections"
```

---

## Self-Review

**Spec coverage:** §1→Task1, §2→Task2, §3→Task3, §4→Task4, global verify/a11y→Task5. All spec sections covered.

**Placeholder scan:** Code steps give real structural JSX with exact tokens/classes; exact copy and micro-spacing are intentionally finalized live with `ui-ux-pro-max`/`impeccable` (this is visual-design work, not unit-testable logic) — flagged transparently rather than faked. File paths and commands are exact.

**Type consistency:** Component exports (`HowItWorks`, `ProductShowcase`, `PricingBasic` unchanged, `LogoCloud`, `CtaCloser`, `SiteFooter`) are referenced consistently in page.tsx wiring. `ProductPanel` reused by Task 2; if moved, update its single import site.

**Note:** Tasks are sequential and share `page.tsx` → execute **inline** (one session) for cross-section consistency, not parallel subagents.
