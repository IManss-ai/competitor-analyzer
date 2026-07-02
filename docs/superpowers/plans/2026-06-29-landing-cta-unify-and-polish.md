# Landing CTA Unification + Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the landing's primary CTA speak in one voice (flat monochrome foreground-fill), fix sub-44px mobile touch targets, delete dead Magic UI components, and land the in-flight hero/showcase depth work — without touching anything in-app.

**Architecture:** Pure frontend edits on `feat/landing-sections-redesign` (PR #34). No backend, no routes, no API. The landing's primary CTA becomes flat `bg-foreground` (white-on-dark / black-on-light) everywhere; blue stays a pure accent. Touch targets reach ≥44px via `min-h-11`. Three unused components are deleted.

**Tech Stack:** Next.js (App Router, modified build — see `frontend/AGENTS.md`), Tailwind v4, shadcn/ui, CSS-var tokens, `browse` (gstack headless Chromium) for visual verification.

## Global Constraints

- **shadcn token names only** in new code: `--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--ring`, etc. No hardcoded hex, no raw `text-white`/`bg-white`, no raw blue hex outside `--primary`.
- **Blue (`--primary`) is accent only** on the landing — links, active/selected, focus rings, signal/live dots, highlighted-card ring. **Not** the landing primary-button fill.
- **Touch targets ≥ 44px** on touch-reachable controls (WCAG 2.5.8).
- **Theme-aware:** every change must render correctly in both `.dark` and light.
- **No spring/bounce, no `transition: all` on new motion;** flat surfaces (no glow).
- **Do NOT modify the shared `cta` button variant** in `components/ui/button.tsx` — it is used in-app (`paywall-overlay.tsx`, `dashboard-client.tsx:542,725`) and must keep its blue gradient. Landing CTAs are restyled at their callsites instead.
- **Frontend-only:** do not break existing routes or the `/api/v1/*` contract.
- Read `frontend/AGENTS.md` before editing — this is a modified Next.js; check `node_modules/next/dist/docs/` if a Next API is involved (none expected here).

### Deviation from spec (intentional)
The spec (section A) proposed *redefining the `cta` button variant*. Planning revealed `variant="cta"` is used by two in-app buttons (Upgrade, Analyze) that must stay blue. The plan therefore leaves `button.tsx` untouched and restyles the landing's final-CTA button inline. Same user-visible outcome (landing primary = mono), narrower blast radius. The app keeps blue CTAs; the landing goes mono — a deliberate marketing-vs-app boundary.

### Verification helper (used by several tasks)
`browse` binary path and a reusable capture-with-reveals snippet:
```bash
B="$HOME/.claude/skills/gstack/browse/dist/browse"
# capture <theme> <WxH> <outfile> — loads, fires scroll-reveals, screenshots full page
capture() { $B storage set theme "$1" >/dev/null 2>&1; $B viewport "$2" >/dev/null 2>&1; \
  $B goto http://localhost:3000 >/dev/null 2>&1; $B wait --networkidle >/dev/null 2>&1; \
  $B js "(function(){window.__y=0;return 1})()" >/dev/null 2>&1; \
  for i in $(seq 1 16); do $B js "(function(){window.__y+=500;window.scrollTo(0,window.__y);return 1})()" >/dev/null 2>&1; sleep 0.3; done; \
  sleep 0.6; $B screenshot "$3" >/dev/null 2>&1 && echo "saved $3"; }
```
Dev server must be running on :3000 (`cd frontend && npm run dev`). Tsc check: `cd frontend && npx tsc --noEmit`.

---

### Task 1: Land the in-flight depth work (spec D)

Commit the already-present, on-brand depth edits cleanly before layering new changes on top. These files are currently modified in the working tree from the prior session and render well in both themes.

**Files:**
- Modify (commit as-is): `frontend/src/app/page.tsx` (hero atmospheric wash, lines ~110–114)
- Modify (commit as-is): `frontend/src/components/landing/product-showcase.tsx` (battle-card backdrop + elevation shadow)

**Interfaces:** none consumed/produced; this is a checkpoint commit of existing work.

- [ ] **Step 1: Confirm the working-tree diff is only the intended depth work**

Run: `cd /var/www/html/competitor-analyzer && git diff --stat frontend/src/app/page.tsx frontend/src/components/landing/product-showcase.tsx`
Expected: `page.tsx` (hero radial-gradient wash) and `product-showcase.tsx` (radial backdrop + `shadow-[…]` on the card) only. Eyeball `git diff` to confirm no stray edits.

- [ ] **Step 2: Confirm it renders (dev server up)**

```bash
B="$HOME/.claude/skills/gstack/browse/dist/browse"
OUT="/tmp/landing-verify"; mkdir -p "$OUT"
# (paste capture() helper from the header)
capture dark 1440x900 "$OUT/t1-dark.png"
```
Read `$OUT/t1-dark.png`: hero shows a restrained blue wash at top; the battle-card in "The product" sits on a soft backdrop with an elevation shadow. No neon, no console errors (`$B console --errors`).

- [ ] **Step 3: Commit ONLY these two files** (leave `globals.css` marquee keyframes uncommitted — handled in Task 4)

```bash
cd /var/www/html/competitor-analyzer
git add frontend/src/app/page.tsx frontend/src/components/landing/product-showcase.tsx
git commit -m "feat(landing): land restrained Stripe-port depth on hero + battle card

Atmospheric single-accent wash behind hero; soft backdrop + elevation
shadow on the product-showcase battle card. Flat, de-neon, both themes."
```
Expected: commit succeeds; `git status` still shows `globals.css` modified + the three untracked `ui/*.tsx` files.

---

### Task 2: Unify landing primary CTA → flat mono + fix its touch targets (spec A + B-buttons)

Make all landing primary "Start free" buttons flat `bg-foreground` (mono), drop the final CTA's blue gradient+glow, and ensure these buttons are ≥44px. Hero/nav are already mono; this mainly changes the final CTA and the highlighted pricing button, plus adds touch height.

**Files:**
- Modify: `frontend/src/components/landing/cta-closer.tsx:22-27`
- Modify: `frontend/src/components/ui/pricing-demo.tsx:119-121`
- Modify: `frontend/src/app/page.tsx` (hero buttons, lines ~150 and ~153)

**Interfaces:**
- Consumes: nothing.
- Produces: the canonical landing primary-CTA classes (reused visually, not exported): `inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-[15px] font-medium text-background transition-opacity hover:opacity-90`.

- [ ] **Step 1: Final CTA — replace the blue gradient button with a flat mono pill**

In `cta-closer.tsx`, replace the primary `<Button variant="cta">` (lines 22-24) with a plain `<Link>` (removes the landing's dependency on the in-app `cta` variant), and add `min-h-11` to the secondary button (lines 25-27). New block for lines 21-28:

```tsx
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={AUTH}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-[15px] font-medium text-background transition-opacity hover:opacity-90"
          >
            Start free <ArrowRight size={16} />
          </Link>
          <Button size="lg" variant="outline" className="min-h-11 rounded-full px-6" asChild>
            <a href="mailto:support@rivalscope.dev">Book a demo</a>
          </Button>
        </div>
```
`Link`, `ArrowRight`, and `Button` are already imported in this file — no import changes.

- [ ] **Step 2: Pricing highlighted tier — change blue fill to mono fill**

In `pricing-demo.tsx`, the CTA className ternary (lines 119-121). Change only the `tier.highlighted` branch:

```tsx
                    tier.highlighted
                      ? "bg-foreground text-background hover:opacity-90"
                      : "border border-border text-foreground hover:bg-muted/40"
```
(The non-highlighted branch is unchanged — Local Business stays outline. `min-h-11` is already on line 118, so touch height is already compliant.)

- [ ] **Step 3: Hero buttons — add `min-h-11` (they are already mono)**

In `page.tsx`, hero "Start free" (~line 150) — add `min-h-11` after `inline-flex`:
```tsx
            <Link href={AUTH} className="group inline-flex min-h-11 items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-[14px] font-medium text-background transition-opacity hover:opacity-90">
              Start free <ArrowRight size={15} />
            </Link>
```
Wait — confirm the exact current class string by reading the file first; the hero "Start free" is the `<Link href={AUTH}>` with `bg-foreground`. Insert `min-h-11` into its className.

Hero "Book a demo" (~line 153) — add `inline-flex min-h-11 items-center`:
```tsx
            <a href="mailto:support@rivalscope.dev" className="inline-flex min-h-11 items-center rounded-full px-4 py-2.5 text-[14px] text-muted-foreground transition-colors hover:text-foreground">
              Book a demo
            </a>
```
(Nav "Start free" at ~line 130 is `md:inline-flex` — desktop-only, not a mobile touch target, already mono. Leave it.)

- [ ] **Step 4: Type-check**

Run: `cd /var/www/html/competitor-analyzer/frontend && npx tsc --noEmit`
Expected: no errors. (A pre-existing `BrandSplashGate` TS error is NOT expected here; if any error references the files you edited, fix it.)

- [ ] **Step 5: Visual + touch-target verification**

```bash
B="$HOME/.claude/skills/gstack/browse/dist/browse"; OUT="/tmp/landing-verify"
# (capture() helper from header)
capture dark 1440x900 "$OUT/t2-dark.png"
capture light 1440x900 "$OUT/t2-light.png"
# Re-measure the landing CTA touch targets on mobile:
$B storage set theme dark >/dev/null 2>&1; $B viewport 390x844 >/dev/null 2>&1
$B goto http://localhost:3000 >/dev/null 2>&1; $B wait --networkidle >/dev/null 2>&1
$B js "(function(){var e=[].slice.call(document.querySelectorAll('a,button'));return JSON.stringify(e.map(function(x){var r=x.getBoundingClientRect();return {t:(x.textContent||'').trim().slice(0,18),h:Math.round(r.height)};}).filter(function(o){return o.t.indexOf('Start free')===0||o.t.indexOf('Book a demo')===0;}));})()"
```
Read `t2-dark.png` + `t2-light.png`: hero, pricing "SaaS Starter", and final CTA primaries are ALL the flat foreground pill (white-on-dark / black-on-light); no blue gradient/glow anywhere; "Local Business" stays outline. The measure output: every visible "Start free"/"Book a demo" height ≥ 44 (the desktop-only nav one may report 0 height on mobile — ignore).

- [ ] **Step 6: Commit**

```bash
cd /var/www/html/competitor-analyzer
git add frontend/src/components/landing/cta-closer.tsx frontend/src/components/ui/pricing-demo.tsx frontend/src/app/page.tsx
git commit -m "feat(landing): unify primary CTA to flat mono + ensure 44px targets

All landing primary CTAs use flat bg-foreground (Linear/Vercel register);
drop the final CTA's blue gradient+glow (de-neon); highlighted pricing
tier goes mono, Local Business stays outline. Adds min-h-11 to hero +
final CTA buttons (WCAG 2.5.8). In-app cta variant untouched."
```

---

### Task 3: Footer touch targets (spec B remainder)

Footer column links render ~26-28px tall and the inline legal row ~20px. Bring them to ≥44px.

**Files:**
- Modify: `frontend/src/components/landing/site-footer.tsx:32` (FooterLink class) and `:64-66` (legal row)

**Interfaces:** none.

- [ ] **Step 1: Column links → 44px tap height**

In `site-footer.tsx`, change the `FooterLink` class constant (line 32) from `block py-1` to a flex row with a 44px floor:
```tsx
  const cls = 'flex min-h-11 items-center text-[13px] text-muted-foreground transition-colors hover:text-foreground';
```

- [ ] **Step 2: Legal row links → 44px tap height**

In the bottom legal row (lines 64-66), add `inline-flex min-h-11 items-center` to each of the three links. Example for line 64:
```tsx
          <Link href="/privacy" className="inline-flex min-h-11 items-center transition-colors hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="inline-flex min-h-11 items-center transition-colors hover:text-foreground">Terms</Link>
          <a href="mailto:support@rivalscope.dev" className="inline-flex min-h-11 items-center transition-colors hover:text-foreground">Support</a>
```

- [ ] **Step 3: Verify footer link heights on mobile**

```bash
B="$HOME/.claude/skills/gstack/browse/dist/browse"
$B storage set theme dark >/dev/null 2>&1; $B viewport 390x844 >/dev/null 2>&1
$B goto http://localhost:3000 >/dev/null 2>&1; $B wait --networkidle >/dev/null 2>&1
$B js "(function(){var e=[].slice.call(document.querySelectorAll('footer a'));return JSON.stringify(e.map(function(x){var r=x.getBoundingClientRect();return {t:(x.textContent||'').trim().slice(0,14),h:Math.round(r.height)};}));})()"
```
Expected: every footer link height ≥ 44. Also `capture dark 1440x900 /tmp/landing-verify/t3.png` and read it — footer spacing still looks balanced, not stretched/awkward.

- [ ] **Step 4: Commit**

```bash
cd /var/www/html/competitor-analyzer
git add frontend/src/components/landing/site-footer.tsx
git commit -m "fix(landing): footer link tap targets to 44px (WCAG 2.5.8)"
```

---

### Task 4: Delete dead Magic UI components + dead keyframes (spec C)

Three unused components and the uncommitted marquee keyframes are dead code. `border-beam` also contradicts the de-neon decision; `marquee` was explicitly rejected for the logo cloud.

**Files:**
- Delete: `frontend/src/components/ui/border-beam.tsx`, `frontend/src/components/ui/marquee.tsx`, `frontend/src/components/ui/number-ticker.tsx`
- Modify (revert hunk): `frontend/src/app/globals.css` (remove the uncommitted `@keyframes marquee` / `--animate-marquee*` additions)

**Interfaces:** none.

- [ ] **Step 1: Confirm nothing imports them**

Run: `cd /var/www/html/competitor-analyzer/frontend && grep -rn "border-beam\|number-ticker\|from '@/components/ui/marquee'\|Marquee\|NumberTicker\|BorderBeam" src --include="*.tsx"`
Expected: NO matches (the only historical hit was the word "marquee" inside a comment in `logo-cloud.tsx`, which does not import the component). If any real import appears, STOP and re-evaluate.

- [ ] **Step 2: Delete the three component files**

```bash
cd /var/www/html/competitor-analyzer
git rm -f frontend/src/components/ui/border-beam.tsx frontend/src/components/ui/marquee.tsx frontend/src/components/ui/number-ticker.tsx 2>/dev/null || \
  rm -f frontend/src/components/ui/border-beam.tsx frontend/src/components/ui/marquee.tsx frontend/src/components/ui/number-ticker.tsx
```
(They are untracked, so `git rm` may fail — `rm` fallback handles it.)

- [ ] **Step 3: Revert the dead marquee keyframes in globals.css**

The only uncommitted change to `globals.css` is the marquee keyframes block (verified: `git diff --stat` shows +18 lines, all marquee). Revert the file to its committed state:
```bash
cd /var/www/html/competitor-analyzer
git diff frontend/src/app/globals.css   # confirm: ONLY the marquee @keyframes / --animate-marquee additions
git checkout -- frontend/src/app/globals.css
```
If `git diff` shows anything other than marquee additions, do NOT `checkout` — manually remove only the marquee hunk instead.

- [ ] **Step 4: Type-check + build still clean**

Run: `cd /var/www/html/competitor-analyzer/frontend && npx tsc --noEmit && npm run build`
Expected: tsc clean; production build succeeds (landing + all routes). No "module not found" for the deleted files.

- [ ] **Step 5: Commit**

```bash
cd /var/www/html/competitor-analyzer
git add -A frontend/src/components/ui/ frontend/src/app/globals.css
git commit -m "chore(landing): remove unused Magic UI components + dead marquee keyframes

border-beam/marquee/number-ticker were committed-but-unused; border-beam
also reintroduced glow (against the de-neon decision). Drops the dead
marquee @keyframes from globals.css."
```

---

### Task 5: Update DESIGN.md accent discipline (spec A-doc)

Reflect the decision: landing/marketing primary CTAs are monochrome foreground-fill; blue is reserved for accents (and the in-app signature `cta` variant).

**Files:**
- Modify: `DESIGN.md` (Accent Discipline section ~line 66; `--primary` usage row ~line 34; Do's ~line 221; Decisions Log)

**Interfaces:** none.

- [ ] **Step 1: Update the Accent Discipline paragraph (~line 66)**

Replace:
> Blue is the only brand color. It appears on: primary CTAs, active/selected nav items, links, focus rings, and signal/live dots. **Never as a background wash on content surfaces, never on decorative cards.** Not an error color (errors use `--destructive`).

With:
> Blue is the only brand color. It appears on: active/selected nav items, links, focus rings, signal/live dots, the highlighted-pricing-card ring, and the **in-app** signature action button (the `cta` button variant — Upgrade/Analyze). **Landing/marketing primary CTAs use monochrome foreground-fill** (`bg-foreground`, Linear/Vercel register), not blue. Never a background wash on content surfaces, never on decorative cards. Not an error color (errors use `--destructive`).

- [ ] **Step 2: Update the `--primary` usage cell (~line 34) and Do's line (~line 221)**

Line 34 `--primary` Usage: change `**Single accent — CTAs, links, active, focus**` → `**Single accent — links, active, focus, signals, in-app cta**`.
Do's (~line 221): change `keep blue for primary CTAs, active state, focus rings, links, signal dots only` → `keep blue for active state, focus rings, links, signal dots, and the in-app cta button only — landing primary CTAs are monochrome foreground-fill`.

- [ ] **Step 3: Add a Decisions Log row**

Add under the Decisions Log table:
```markdown
| 2026-06-29 | Landing primary CTAs go monochrome (foreground-fill) | Faithful Linear/Vercel port + de-neon; blue stays a pure signal color. In-app `cta` variant (Upgrade/Analyze) keeps its blue gradient — marketing-vs-app boundary. |
```

- [ ] **Step 4: Commit**

```bash
cd /var/www/html/competitor-analyzer
git add DESIGN.md
git commit -m "docs(design): landing primary CTAs are monochrome; blue = accent + in-app cta"
```

---

### Task 6: Full verification + update PR #34

**Files:** none (verification + push).

- [ ] **Step 1: Clean build from scratch**

Run: `cd /var/www/html/competitor-analyzer/frontend && npx tsc --noEmit && npm run build`
Expected: tsc clean, build succeeds.

- [ ] **Step 2: Full three-surface visual sweep**

```bash
OUT="/tmp/landing-verify"
# (capture() helper)
capture dark 1440x900 "$OUT/final-dark.png"
capture light 1440x900 "$OUT/final-light.png"
capture dark 390x844 "$OUT/final-mobile.png"
$B console --errors
```
Read all three. Confirm: one consistent flat-mono primary CTA across hero/pricing/final-CTA in both themes; no blue gradient/glow; Local Business outline intact; depth wash present on hero + battle card; mobile stacks cleanly with no horizontal scroll; zero console errors.

- [ ] **Step 3: Confirm working tree is clean and push**

```bash
cd /var/www/html/competitor-analyzer
git status   # expect: clean (all changes committed)
git log --oneline -6
git push origin feat/landing-sections-redesign
```
Expected: push succeeds; PR #34 updates. If push fails with "Password authentication not supported", retry with `env -u GITHUB_TOKEN git push origin feat/landing-sections-redesign` (known token-shadowing gotcha).

- [ ] **Step 4: Confirm the Vercel preview on PR #34 builds**

Run: `gh pr checks 34` (or note the preview URL from `gh pr view 34`).
Expected: Vercel preview build queued/succeeds. Report the preview URL for the user to eyeball.

---

## Self-Review

**Spec coverage:**
- A (unify CTA → mono): Task 2 (cta-closer, pricing, hero) + Task 5 (DESIGN.md). ✓ Mechanism deviates (inline restyle vs variant redefine) — documented in Global Constraints. ✓
- B (≥44px touch targets): Task 2 (hero + final CTA buttons) + Task 3 (footer). ✓
- C (delete dead components): Task 4. ✓
- D (land depth work): Task 1. ✓
- Non-finding (reveal artifact): correctly excluded — no task. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases". Step 3 of Task 2 instructs reading the exact hero class string before inserting `min-h-11` (the line number is approximate) — this is a guard, not a placeholder; the surrounding code is shown. ✓

**Type/name consistency:** No new exported symbols. Class strings are literal. `min-h-11`, `bg-foreground`, `text-background` used consistently. The deleted-component names in Task 4's grep match the file names in the Files block. ✓

**Boundary check:** `button.tsx` `cta` variant is explicitly NOT modified (in-app dependency) — consistent across Global Constraints, Task 2, and Task 5. ✓
