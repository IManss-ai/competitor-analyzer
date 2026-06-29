# Landing Clarity-First + Motion Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a first-time visitor instantly understand what Rivalscope does (clear hero), cut repetitive copy, and add restrained product-led motion + one inline-SVG diagram to the hero, how-it-works, and product-showcase sections.

**Architecture:** Clarity is a static copy/hierarchy fix shipped first and independently. Motion is layered on top via `motion/react`, reusing the existing `Reveal`/`RevealGroup`/`RevealItem` primitives where possible; two small new client components (`CountUp`, `PipelineLine`). Reduced-motion correctness is guaranteed globally with `<MotionConfig reducedMotion="user">` plus explicit `useReducedMotion()` gates.

**Tech Stack:** Next.js (App Router, modified — see `frontend/AGENTS.md`), Tailwind v4, `motion/react` (already a dep), inline SVG, `browse` for visual + reduced-motion verification.

## Global Constraints

- **Motion: `transform`/`opacity` only.** Durations within `--duration-fast/base/slow` = 100/160/240ms; ease `[0.16,1,0.3,1]` (`--ease-smooth`). **No spring/bounce, no `transition: all`.** One motion idea per section; one pass on view; no perpetual loops (existing `animate-pulse` live dot is the only continuous motion).
- **Reduced motion is load-bearing:** under `prefers-reduced-motion: reduce`, every section shows its **final resting state**. Verify with reduced-motion screenshots — default-state screenshots do NOT catch a broken reduced-motion path.
- **Light illustration = inline SVG only** (theme-aware tokens: `var(--border)`, `var(--primary)`). No AI art, no image assets, no new deps.
- **Preserve the existing real product fragments** (chips, mini intel feed, battle card, plays) — make them move; do not replace with generic art.
- **Accent discipline unchanged:** blue only as signal. **Do not regress** the prior pass: primary CTAs stay flat mono (`bg-foreground`); touch targets stay ≥44px.
- shadcn token names only; both themes must render correctly. Read `frontend/AGENTS.md` before editing.
- Dev server on :3000 (`cd frontend && npm run dev`). Type-check: `cd frontend && npx tsc --noEmit`.

### Verification helpers (used across tasks)
```bash
B="$HOME/.claude/skills/gstack/browse/dist/browse"
# capture <theme> <WxH> <out> — load, fire reveals via scroll-through, full-page screenshot
capture(){ $B storage set theme "$1" >/dev/null 2>&1; $B viewport "$2" >/dev/null 2>&1; \
  $B goto http://localhost:3000 >/dev/null 2>&1; $B wait --networkidle >/dev/null 2>&1; \
  $B js "(function(){window.__y=0;return 1})()" >/dev/null 2>&1; \
  for i in $(seq 1 16); do $B js "(function(){window.__y+=500;window.scrollTo(0,window.__y);return 1})()" >/dev/null 2>&1; sleep 0.3; done; \
  sleep 0.6; $B screenshot "$3" >/dev/null 2>&1 && echo "saved $3"; }
# reduced-motion capture: emulate prefers-reduced-motion, then capture
rmcap(){ $B cdp Emulation.setEmulatedMedia '{"features":[{"name":"prefers-reduced-motion","value":"reduce"}]}' >/dev/null 2>&1; capture "$1" "$2" "$3"; }
```
If `cdp Emulation.setEmulatedMedia` is not allowlisted, fall back to setting reduced-motion via DevTools is unavailable — instead verify reduced-motion by reading the new components and confirming the `useReducedMotion()`/`MotionConfig` paths return final state, and note it in the report.

---

### Task 1: Hero clarity (static — the load-bearing fix)

Rewrite the hero so a stranger understands Rivalscope with zero motion. Ships independently.

**Files:**
- Modify: `frontend/src/app/page.tsx` (hero `<header>`, ~lines 136–148)

**Interfaces:** none.

- [ ] **Step 1: Add eyebrow + rewrite H1 + subhead**

In `page.tsx`, the hero `<header>`. Insert an eyebrow `<p>` directly before the `<h1>`, replace the `<h1>` text, and replace the subhead `<p>` text. Result:

```tsx
        <header className="pb-16 pt-20 md:pb-24 md:pt-28">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Competitive intelligence for sales teams
          </p>
          <h1 className="max-w-[760px] text-balance text-[clamp(38px,6vw,64px)] font-medium leading-[1.03] tracking-[-0.022em] text-foreground">
            Track every competitor. Turn each change into a winning play.
          </h1>
          <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-[520px] text-[15px] leading-relaxed text-muted-foreground">
              Pricing, messaging and hiring, watched around the clock and compiled into ranked sales plays your reps can send.
            </p>
```
(Leave the "New · Auto-generated battle cards" link and the CTA row exactly as they are.)

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit` → exit 0.

- [ ] **Step 3: Stranger test (static)**

```bash
B="$HOME/.claude/skills/gstack/browse/dist/browse"
$B storage set theme dark >/dev/null 2>&1; $B viewport 1440x1000 >/dev/null 2>&1
$B goto http://localhost:3000 >/dev/null 2>&1; $B wait --networkidle >/dev/null 2>&1
$B screenshot /tmp/landing-verify/t1-hero.png --selector header >/dev/null 2>&1
```
Read `t1-hero.png`: eyebrow → headline → subhead read top-to-bottom and plainly state what Rivalscope does. No motion needed to understand it.

- [ ] **Step 4: Commit**

```bash
cd /var/www/html/competitor-analyzer
git add frontend/src/app/page.tsx
git commit -m "feat(landing): clarity-first hero — eyebrow + plain-language headline

Names the category + audience (eyebrow), states what it does in the H1
('Track every competitor. Turn each change into a winning play.'), keeps
the concrete subhead. Static fix — a first-time visitor now understands
the product with no motion."
```

---

### Task 2: Motion foundation — reduced-motion config + CountUp

Add the global reduced-motion guarantee and the count-up primitive. No visible change yet except wiring.

**Files:**
- Create: `frontend/src/components/landing/motion-provider.tsx`
- Create: `frontend/src/components/ui/count-up.tsx`
- Modify: `frontend/src/app/page.tsx` (wrap landing root in `<MotionProvider>`)

**Interfaces:**
- Produces: `MotionProvider` (client wrapper); `CountUp({ to: number, className?: string })` — renders an integer that animates 0→`to` once on view, snaps to `to` under reduced motion.

- [ ] **Step 1: MotionProvider (global reduced-motion)**

Create `frontend/src/components/landing/motion-provider.tsx`:
```tsx
'use client';

import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

// reducedMotion="user" makes motion/react snap transform-based animations to
// their final state for users with prefers-reduced-motion, while keeping gentle
// opacity fades. Wraps the landing so every reveal respects the OS setting.
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
```

- [ ] **Step 2: CountUp**

Create `frontend/src/components/ui/count-up.tsx`:
```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';

export function CountUp({ to, className }: { to: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -80px 0px' });
  const reduce = useReducedMotion();
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) { setVal(to); return; }
    const controls = animate(0, to, {
      duration: 1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, reduce, to]);

  return <span ref={ref} className={className}>{val}</span>;
}
```

- [ ] **Step 3: Wrap the landing root**

In `page.tsx`, import `MotionProvider` and wrap the top-level returned `<div className="relative min-h-[100dvh] ...">` so the whole landing is inside it:
```tsx
import { MotionProvider } from '@/components/landing/motion-provider';
// ...
export default function Landing() {
  return (
    <MotionProvider>
      <div className="relative min-h-[100dvh] overflow-x-hidden bg-background text-foreground antialiased">
        {/* ...existing content unchanged... */}
      </div>
    </MotionProvider>
  );
}
```

- [ ] **Step 4: Type-check + build**

Run: `cd frontend && npx tsc --noEmit && npm run build` → both succeed. (MotionProvider is a client boundary wrapping server children — allowed via the `children` prop.)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/landing/motion-provider.tsx frontend/src/components/ui/count-up.tsx frontend/src/app/page.tsx
git commit -m "feat(landing): motion foundation — MotionConfig reduced-motion + CountUp

Wrap landing in <MotionConfig reducedMotion='user'> so all reveals respect
prefers-reduced-motion; add a CountUp primitive (gated with useReducedMotion)."
```

---

### Task 3: Hero motion — feed streams in + stats count up

**Files:**
- Modify: `frontend/src/app/page.tsx` (`ProductPanel`: stats ~lines 73–81, intel feed ~lines 82–99)

**Interfaces:** Consumes `CountUp`, `RevealGroup`, `RevealItem`.

- [ ] **Step 1: Count up the four stats**

In `ProductPanel`, the stats `.map` renders `{v}` as a string ('12','47','8','5'). Import `CountUp` and render the numeric value via it. Change the value cell:
```tsx
                <p className="mt-1 font-mono text-[26px] font-semibold tabular-nums tracking-[-0.03em]" style={i === 3 ? { color: 'var(--primary)' } : undefined}>
                  <CountUp to={Number(v)} />
                </p>
```
Add `import { CountUp } from '@/components/ui/count-up';` at the top.

- [ ] **Step 2: Stream the intel feed rows in**

Wrap the feed rows (the `FEED.map(...)` block, ~lines 89–98) in a `RevealGroup`, and each row in a `RevealItem`. Import `RevealGroup, RevealItem` from `@/components/reveal`. The container that currently holds the rows becomes:
```tsx
            <RevealGroup>
              {FEED.map((r) => (
                <RevealItem key={r.name}>
                  <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0">
                    {/* ...existing row content unchanged... */}
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
```
Keep the "Intel feed / Live" header row outside the RevealGroup (it stays static with its pulsing dot).

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit` → exit 0.

- [ ] **Step 4: Verify motion + reduced-motion**

```bash
# motion: numbers should land on 12/47/8/5, feed rows present
capture dark 1440x1000 /tmp/landing-verify/t3-motion.png
# reduced-motion: numbers final, rows shown, no pre-transform offset
rmcap dark 1440x1000 /tmp/landing-verify/t3-reduced.png
$B console --errors
```
Read both. Motion shot: stats show final values (12/47/8/5), feed rows visible. Reduced-motion shot: identical final state (stats correct, all rows visible). No console errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat(landing): hero comes alive — intel feed streams in, stats count up"
```

---

### Task 4: How it works — cut copy + pipeline diagram + activation

**Files:**
- Create: `frontend/src/components/landing/pipeline-line.tsx`
- Modify: `frontend/src/components/landing/how-it-works.tsx` (STEPS desc ~lines 18–57; insert line)

**Interfaces:** Consumes `useReducedMotion`, `useInView` from motion/react.

- [ ] **Step 1: Cut each step description to ≤6 words**

In `how-it-works.tsx`, change the three `desc` strings in `STEPS`:
```tsx
// Connect step:
    desc: 'Paste URLs — we map the rest.',
// Detect step:
    desc: 'Every change, the moment it lands.',
// Win step:
    desc: 'One card. Five ranked plays.',
```
(Each ≤6 words. Titles and fragments unchanged — they carry the detail.)

- [ ] **Step 2: PipelineLine component (inline SVG, draws on view, hidden on mobile)**

Create `frontend/src/components/landing/pipeline-line.tsx`:
```tsx
'use client';

import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';

// Horizontal Connect → Detect → Win flow line. Drawn with stroke-dashoffset on
// view. Hidden on mobile (steps stack; never a half-drawn line). Theme-aware.
export function PipelineLine() {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -80px 0px' });
  const reduce = useReducedMotion();
  const draw = reduce ? { pathLength: 1 } : inView ? { pathLength: 1 } : { pathLength: 0 };
  return (
    <svg ref={ref} aria-hidden className="hidden h-2 w-full sm:block" viewBox="0 0 100 2" preserveAspectRatio="none">
      <line x1="0" y1="1" x2="100" y2="1" stroke="var(--border)" strokeWidth="0.5" />
      <motion.line
        x1="0" y1="1" x2="100" y2="1" stroke="var(--primary)" strokeWidth="0.5"
        initial={{ pathLength: 0 }}
        animate={draw}
        transition={{ duration: reduce ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}
```

- [ ] **Step 3: Place the line between the heading and the steps grid**

In `how-it-works.tsx`, import `PipelineLine` and render it just above the `RevealGroup` steps grid (inside the section, after the `Reveal` heading block):
```tsx
      <div className="mt-10 px-1"><PipelineLine /></div>
      <RevealGroup className="mt-6 grid overflow-hidden rounded-xl border border-border sm:grid-cols-3">
```
(The steps already use `RevealGroup`/`RevealItem`, so the fragments already stagger-activate on view — no extra motion needed; the cut copy + the line are the change.)

- [ ] **Step 4: Type-check + verify (text cut, motion, reduced-motion, mobile)**

```bash
cd frontend && npx tsc --noEmit
# word-count check on the captions (each ≤6 words)
grep -n "desc:" src/components/landing/how-it-works.tsx
capture dark 1440x1000 /tmp/landing-verify/t4.png
rmcap dark 1440x1000 /tmp/landing-verify/t4-reduced.png
# mobile: line hidden, steps stack
$B storage set theme dark >/dev/null 2>&1; $B viewport 390x844 >/dev/null 2>&1
$B goto http://localhost:3000 >/dev/null 2>&1; $B wait --networkidle >/dev/null 2>&1
$B screenshot /tmp/landing-verify/t4-mobile.png >/dev/null 2>&1
```
Read shots: desktop shows the flow line drawn between heading and steps; captions are short; reduced-motion shows the line fully drawn + steps visible; mobile has no flow line and steps stack cleanly. Each `desc` ≤6 words.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/landing/how-it-works.tsx frontend/src/components/landing/pipeline-line.tsx
git commit -m "feat(landing): how-it-works — trim captions to <=6 words + pipeline diagram"
```

---

### Task 5: Product showcase — cut copy + battle card assembles

**Files:**
- Modify: `frontend/src/components/landing/product-showcase.tsx` (subhead ~line 77–79; ROWS desc lines 59, 64)
- Modify: `frontend/src/components/landing-battlecard.tsx` (quadrant container ~line 161; quadrants ~163–214)

**Interfaces:** Consumes `motion`, `useReducedMotion` from motion/react; reuses `fadeUpVariants`, `staggerContainerVariants`.

- [ ] **Step 1: Cut product-showcase copy**

In `product-showcase.tsx`: tighten the section subhead and the two row descriptions to one line each.
```tsx
// section subhead (~line 77-79):
        <p className="mt-5 max-w-[460px] text-[15px] leading-relaxed text-muted-foreground">
          Every change, complaint and signal — compiled into one card your reps can act on.
        </p>
// ROWS[0].desc:
    desc: 'Every change, categorized and timestamped.',
// ROWS[1].desc:
    desc: 'Pulled from real complaints, ordered by what closes.',
```

- [ ] **Step 2: Battle card assembles on view (fast, subtle, one pass)**

In `landing-battlecard.tsx`, convert the keyed content container (line 161, currently `<div key={active} className="space-y-3 p-4 [animation:fadeIn_...]">`) into a motion stagger, and wrap each of the four `Quadrant`s in a `motion.div` using `fadeUpVariants`. Import at top: `import { motion } from 'motion/react'; import { fadeUpVariants, staggerContainerVariants } from '@/lib/animations';`

Replace the container open tag and wrap quadrants:
```tsx
      <motion.div
        key={active}
        className="space-y-3 p-4"
        variants={staggerContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      >
        <motion.div variants={fadeUpVariants}>
          <Quadrant title="Detected changes">{/* ...unchanged... */}</Quadrant>
        </motion.div>
        <motion.div variants={fadeUpVariants} className="grid gap-3 sm:grid-cols-2">
          <Quadrant title="User complaints">{/* ...unchanged... */}</Quadrant>
          <Quadrant title="Strategic signals">{/* ...unchanged... */}</Quadrant>
        </motion.div>
        <motion.div variants={fadeUpVariants}>
          <Quadrant title="Top plays">{/* ...unchanged... */}</Quadrant>
        </motion.div>
      </motion.div>
```
This removes the CSS `[animation:fadeIn...]` (replaced by the stagger). `staggerContainerVariants` staggers children by 0.08s; `fadeUpVariants` is fade+rise ~0.5s — fast, one pass. `MotionConfig reducedMotion="user"` (Task 2) snaps the transforms to final state for reduced-motion users; re-assembles on tab change (acceptable — reads as fresh data).

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit` → exit 0.

- [ ] **Step 4: Verify (text cut, assemble motion, reduced-motion, tab-switch)**

```bash
capture dark 1440x1000 /tmp/landing-verify/t5.png
rmcap dark 1440x1000 /tmp/landing-verify/t5-reduced.png
# tab switch still works + re-assembles, no console errors
$B storage set theme dark >/dev/null 2>&1; $B viewport 1440x1000 >/dev/null 2>&1
$B goto http://localhost:3000 >/dev/null 2>&1; $B wait --networkidle >/dev/null 2>&1
$B js "(function(){var c=[].slice.call(document.querySelectorAll('button')).filter(function(b){return /paypal/i.test(b.textContent||'')})[0];if(c)c.click();return c?'clicked paypal':'no tab'})()"
sleep 0.5
$B screenshot /tmp/landing-verify/t5-paypal.png --selector "#product" >/dev/null 2>&1
$B console --errors
```
Read shots: showcase copy is one-liners; battle card quadrants present (assembled); reduced-motion shows all quadrants final; PayPal tab switch shows PayPal data. No console errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/landing/product-showcase.tsx frontend/src/components/landing-battlecard.tsx
git commit -m "feat(landing): product showcase — one-line copy + battle card assembles on view"
```

---

### Task 6: Full verification + push

**Files:** none.

- [ ] **Step 1: Clean build**

Run: `cd frontend && npx tsc --noEmit && npm run build` → both succeed.

- [ ] **Step 2: Reduced-motion stranger test (the primary goal)**

```bash
$B cdp Emulation.setEmulatedMedia '{"features":[{"name":"prefers-reduced-motion","value":"reduce"}]}' >/dev/null 2>&1
$B storage set theme dark >/dev/null 2>&1; $B viewport 1440x1000 >/dev/null 2>&1
$B goto http://localhost:3000 >/dev/null 2>&1; $B wait --networkidle >/dev/null 2>&1
$B screenshot /tmp/landing-verify/final-rm-hero.png --selector header >/dev/null 2>&1
```
Read it: with motion OFF, the hero still communicates what Rivalscope does (eyebrow + headline + subhead). If not, the redesign fails its primary goal — STOP and fix.

- [ ] **Step 3: Full sweep + no-regression check**

```bash
capture dark 1440x1000 /tmp/landing-verify/final-dark.png
capture light 1440x1000 /tmp/landing-verify/final-light.png
capture dark 390x844 /tmp/landing-verify/final-mobile.png
# no regression: mono CTAs + 44px targets from the prior pass
$B viewport 390x844 >/dev/null 2>&1; $B goto http://localhost:3000 >/dev/null 2>&1; $B wait --networkidle >/dev/null 2>&1
$B js "(function(){var e=[].slice.call(document.querySelectorAll('a,button'));return JSON.stringify(e.map(function(x){var r=x.getBoundingClientRect();return {t:(x.textContent||'').trim().slice(0,14),h:Math.round(r.height)}}).filter(function(o){return /Start free|Book a demo/.test(o.t)}));})()"
$B console --errors
```
Read all three. Confirm: clear hero, motion present (dark/mobile), both themes correct, CTAs still flat mono ≥44px, no console errors.

- [ ] **Step 4: Commit any verification-driven fixes, then push**

```bash
cd /var/www/html/competitor-analyzer
git status --short | grep -v "^??" || echo "clean"
git log --oneline origin/feat/landing-sections-redesign..HEAD
env -u GITHUB_TOKEN git push origin feat/landing-sections-redesign
```
(`env -u GITHUB_TOKEN` avoids the known token-shadowing push failure.)

- [ ] **Step 5: Confirm Vercel preview builds**

Run: `env -u GITHUB_TOKEN gh pr checks 34` → Vercel resolves to `pass`. Report the preview URL.

---

## Self-Review

**Spec coverage:**
- Clarity (eyebrow + V2 H1 + subhead): Task 1. ✓
- Reduced-motion load-bearing: Task 2 (`MotionConfig` + `CountUp` gate), verified Tasks 3/4/5/6. ✓
- Hero motion (feed stream + count-ups): Task 3. ✓
- How-it-works (≤6-word captions + SVG pipeline + activation): Task 4. ✓
- Product-showcase (one-line copy + assemble): Task 5. ✓
- Light illustration = inline SVG: Task 4 `PipelineLine`. ✓
- Preserve product fragments / make them move: Tasks 3/4/5 reuse existing fragments. ✓
- No CTA/44px regression: Task 6 Step 3. ✓
- Out-of-scope (pricing/cta-closer/footer/nav/backend): untouched. ✓

**Placeholder scan:** No TBD/TODO. `{/* ...unchanged... */}` markers in Task 5 Step 2 refer to existing code shown in this plan's battle-card reference and are explicitly "keep as-is", not new code to invent. Copy strings are concrete. ✓

**Type/name consistency:** `CountUp({to,className})`, `MotionProvider({children})`, `PipelineLine()` used consistently with their definitions. `fadeUpVariants`/`staggerContainerVariants` match `lib/animations.ts`. Reuses `RevealGroup`/`RevealItem` with their existing signatures. ✓

**Ordering:** Task 1 (clarity) ships standalone and first, per the advisor's "build the clear static state and pass the stranger test before any motion." Task 2 lays the reduced-motion foundation before any motion is added in Tasks 3–5. ✓
