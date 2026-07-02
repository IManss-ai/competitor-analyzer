# Premium Blue Whole-App Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the founder-approved "Premium Blue" design system (Instrument Serif + Mercury indigo `#5266EB` + Linear precision) onto the live app and deploy it to rivalscope.dev, both themes.

**Architecture:** Token-first. Phase A (Tier 0) swaps design tokens in `globals.css` (re-skins all routes via the alias layer + `sky-*`→`--primary` remap), adds depth in the one shared component that doesn't auto-propagate (`card.tsx`), wires Instrument Serif, and restyles the global shell. Phase B (Tier 1) art-directs the 4 demo-path screens. Phase C verifies both themes and deploys.

**Tech Stack:** Modified **Next 16** (App Router) · Tailwind CSS v4 · shadcn/Radix · Framer Motion (`motion/react`) · Geist + Instrument Serif fonts · oklch CSS-var tokens.

**Spec:** `docs/superpowers/specs/2026-06-26-premium-blue-redesign-design.md` (read §3 token table + §7 acceptance before each task).

## Global Constraints
- **Modified Next 16:** read `node_modules/next/dist/docs/` for the relevant API BEFORE editing `app/layout.tsx` or font loading — conventions differ from training data.
- **Both themes:** every touched screen must render correctly in dark AND light, verified in a real browser (the "test" for this plan).
- **Tokens only:** shadcn primitives + CSS-var tokens. No raw hex outside token definitions in `globals.css`. No raw `text-white`/`bg-white` except on verified-contrast accent surfaces. No raw blue hex outside `--primary`/`--gradient-primary`.
- **Instrument Serif = display only, ≥28px.** Never on dense tables, form labels, buttons, nav, or small text. Functional headings stay Geist Sans semibold.
- **Motion:** no spring/bounce. Use `--duration-*` + `--ease-*` only. Allowed: count-ups, blue signal-pulse, reveal-on-scroll fades.
- **No regressions:** real API data + Polar billing intact; provenance/"inferred" honesty UI preserved. 8pt spacing scale unchanged.
- **Branch:** `style/design-polish`. Commit per task. **Deploy (push to `main`) is production and requires explicit founder confirmation** — never push `main` unprompted.
- **Anti-slop gate (spec §7):** hold every screen to the 10-item checklist; blue-as-brand is the one consciously-overridden item.

---

### Task 1: Wire Instrument Serif + display-font token

**Files:**
- Modify: `frontend/src/app/layout.tsx` (add font loader + variable on `<html>`)
- Modify: `frontend/src/app/globals.css` (add `--font-display` + `.font-display` utility)

**Interfaces:**
- Produces: CSS var `--font-instrument-serif`, token `--font-display`, utility class `.font-display` (used by every later headline task).

- [ ] **Step 1: Read the Next 16 font API.** Open `node_modules/next/dist/docs/` (or the app/font guide) and confirm the `next/font/google` import + `variable` wiring for this Next version.

- [ ] **Step 2: Add the font loader** in `app/layout.tsx` (alongside the existing Geist imports):
```tsx
import { Instrument_Serif } from "next/font/google";
const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
});
```
Add `instrumentSerif.variable` to the existing `<html className={...}>` (or `<body>`) class list next to the Geist variables.

- [ ] **Step 3: Add the token + utility** to `globals.css` `:root` (near the font block ~line 56) and the utilities area:
```css
/* :root */
--font-display: var(--font-instrument-serif), Georgia, "Times New Roman", serif;
```
```css
/* utility (place after base styles) */
.font-display { font-family: var(--font-display); font-weight: 400; letter-spacing: -0.01em; line-height: 1.05; }
```

- [ ] **Step 4: Smoke-render.** Temporarily add `className="font-display text-5xl"` to one landing headline, run the dev server (`cd frontend && npm run dev`), load `/` in a browser.
Expected: headline renders in Instrument Serif (a high-contrast serif), not Geist. Revert the temporary change.

- [ ] **Step 5: Commit**
```bash
git add frontend/src/app/layout.tsx frontend/src/app/globals.css
git commit -m "feat(design): wire Instrument Serif display font + token"
```

---

### Task 2: Swap color / radius / surface tokens (the propagating re-skin)

**Files:**
- Modify: `frontend/src/app/globals.css` (`:root` light block + the `.dark` override block)

**Interfaces:**
- Produces: new `--primary`, `--ring`, surface tokens, `--radius`, and `--gradient-primary` (consumed by Task 3/4 + all screens).

- [ ] **Step 1: Light `:root` — primary, ring, radius, gradient.** Replace the current values:
```css
--radius: 0.75rem;                          /* was 0.5rem */
--primary: oklch(0.57 0.20 272);            /* Mercury indigo #5266EB (was 0.546 0.245 262.881) */
--ring:    oklch(0.57 0.20 272);
--sidebar-primary: oklch(0.57 0.20 272);
--sidebar-ring:    oklch(0.57 0.20 272);
--gradient-primary: linear-gradient(135deg, oklch(0.57 0.20 272), oklch(0.72 0.13 264));
/* light surfaces — soft lavender-white */
--background: oklch(0.99 0.003 285);
--card:       oklch(1 0 0);
--muted:      oklch(0.975 0.004 285);
```

- [ ] **Step 2: `.dark` block — primary + near-black surfaces.** In the `.dark { … }` override block (further down `globals.css`), set:
```css
--primary: oklch(0.62 0.19 270);            /* brighter Mercury blue for dark */
--ring:    oklch(0.62 0.19 270);
--sidebar-primary: oklch(0.62 0.19 270);
--gradient-primary: linear-gradient(135deg, oklch(0.62 0.19 270), oklch(0.74 0.13 262));
--background: oklch(0.145 0.004 285);        /* near-black ~#0A0A0C */
--card:       oklch(0.185 0.006 285);        /* ~#121216 */
--popover:    oklch(0.205 0.006 285);        /* elevated ~#17171C */
--muted:      oklch(0.205 0.006 285);
```
(Keep `--foreground`, border, sidebar bg consistent; only change what's listed. Read the existing `.dark` values first and edit in place.)

- [ ] **Step 2b: Re-verify accent propagation** before relying on it:
```bash
cd frontend && grep -rE 'bg-blue-|text-blue-|border-blue-' --include=*.tsx src | wc -l   # expect 0
```

- [ ] **Step 3: Visual verify propagation, BOTH themes.** Dev server running, load `/dashboard`, `/trends`, `/queue` (a Tier-2 screen we are NOT bespoke-editing). Toggle theme.
Expected: new indigo accent + larger radii appear on all three with zero per-screen edits; neutrals unchanged; no contrast failures (text on cards still readable both themes).

- [ ] **Step 4: Commit**
```bash
git add frontend/src/app/globals.css
git commit -m "feat(design): Mercury indigo primary + radius + surface tokens, both themes"
```

---

### Task 3: Add Mercury layered depth (the one token that doesn't auto-propagate)

**Files:**
- Modify: `frontend/src/app/globals.css` (`--shadow-card` / `--shadow-card-hover`, light + dark)
- Modify: `frontend/src/components/ui/card.tsx` (make `<Card>` consume the shadow)
- Modify: `frontend/src/app/(dashboard)/dashboard/dashboard-client.tsx` (align ad-hoc `shadow-sm`/`shadow-lg` to the card depth)

- [ ] **Step 1: Replace flat shadow tokens** in `globals.css` `:root` (light, ~line 100):
```css
--shadow-card:       0 10px 16px rgba(28,28,35,.02), 0 6px 10px rgba(28,28,35,.04), 0 0 3px rgba(28,28,35,.09);
--shadow-card-hover: 0 16px 24px rgba(28,28,35,.04), 0 8px 14px rgba(28,28,35,.06), 0 0 3px rgba(28,28,35,.10);
```
And in `.dark`:
```css
--shadow-card:       inset 0 1px 0 rgba(255,255,255,.05), 0 14px 28px -10px rgba(0,0,0,.7), 0 4px 10px -4px rgba(0,0,0,.5);
--shadow-card-hover: inset 0 1px 0 rgba(255,255,255,.06), 0 22px 40px -14px rgba(0,0,0,.75), 0 6px 14px -6px rgba(0,0,0,.6);
```

- [ ] **Step 2: Make `<Card>` consume it.** In `card.tsx`, add `shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]` to the `Card` root `cn(...)` (keep the existing `ring-1 ring-foreground/10` hairline):
```tsx
"group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card)] transition-shadow duration-(--duration-base) hover:shadow-[var(--shadow-card-hover)] py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 ..."
```

- [ ] **Step 3: Align ad-hoc shadows.** In `dashboard-client.tsx`, replace standalone `shadow-sm`/`shadow-lg` on card-like surfaces with `shadow-[var(--shadow-card)]` so depth is consistent. Leave overlay/popover shadows (`--shadow-elevated`/`--shadow-modal`) alone.

- [ ] **Step 4: Visual verify, BOTH themes.** Reload `/dashboard`. Cards now show layered elevation (lifted, crafted), not flat. Hover lifts subtly. Light + dark both correct.

- [ ] **Step 5: Commit**
```bash
git add frontend/src/app/globals.css frontend/src/components/ui/card.tsx "frontend/src/app/(dashboard)/dashboard/dashboard-client.tsx"
git commit -m "feat(design): Mercury layered card depth, both themes"
```

---

### Task 4: Button primitive — pill radius + gradient primary

**Files:**
- Modify: `frontend/src/components/ui/button.tsx`

- [ ] **Step 1: Read the current variants** (`cva` config) to find the `default`/primary variant + base radius.
- [ ] **Step 2: Pill + gradient primary.** In the base classes use `rounded-full`; in the `default` (primary) variant set the background to the gradient and keep accessible white text + the focus ring:
```tsx
// base: "... rounded-full ..."
// default variant:
"text-primary-foreground [background-image:var(--gradient-primary)] shadow-[0_8px_22px_-8px_color-mix(in_oklab,var(--primary)_70%,transparent)] hover:brightness-[1.05]"
```
Leave `secondary`/`ghost`/`outline`/`link` variants on solid tokens (only the primary CTA gets the gradient — gradient is scarce per spec §3.2).

- [ ] **Step 3: Visual verify, BOTH themes.** A primary button is a gradient pill with readable text and a visible focus ring on keyboard focus; secondary/ghost unchanged. Contrast AA both themes.

- [ ] **Step 4: Commit**
```bash
git add frontend/src/components/ui/button.tsx
git commit -m "feat(design): pill primary button with scarce blue gradient"
```

---

### Task 5: Restyle the global shell (sidebar + topbar)

**Files:**
- Modify: `frontend/src/components/sidebar.tsx`
- Modify: `frontend/src/components/topbar.tsx`

- [ ] **Step 1: Read both files** to learn current structure (nav items, account chip, theme toggle, existing classes).
- [ ] **Step 2: Sidebar.** Group nav into **Desk** (Dashboard, Competitors, Campaigns, Discover) and **Signal** (Intel Feed, Battle Cards, Trends, Action Queue) with small mono group labels; active item uses `--primary` (left accent bar or filled pill); account chip shows email + TRIAL/PRO badge + "N days left"; add a **blue signal-pulse dot** ("watching N"); keep "Scan all now" + the "Upgrade to Pro" gradient CTA. Use token colors only.
- [ ] **Step 3: Topbar.** Page title (Geist Sans semibold; reserve `.font-display` for large page H1s only) + date, and the existing theme toggle restyled to tokens.
- [ ] **Step 4: Visual verify, BOTH themes.** Shell reads premium: grouped nav, live pulse, gradient upgrade CTA, correct active state, no contrast issues. Toggle theme — both correct, charts/accents follow (regression check on the existing theme-sync fix).
- [ ] **Step 5: Commit**
```bash
git add frontend/src/components/sidebar.tsx frontend/src/components/topbar.tsx
git commit -m "feat(design): premium global shell — grouped nav, signal pulse, gradient CTA"
```

---

### ✅ Tier 0 GATE (checkpoint)
Run `cd frontend && npm run build`. Expected: build passes, no type errors. Load `/dashboard` + one Tier-2 screen in both themes; confirm the whole app already looks materially more premium (color, depth, radius, shell, serif headlines where applied). **This is the "every screen improved at once" milestone.** Pause for founder review before Tier 1. Optional intermediate deploy here only on founder confirmation.

---

### Task 6: Tier 1 — Head-to-Head wow screen (most design budget)

**Files:**
- Modify: `frontend/src/components/head-to-head.tsx`
- Modify: `frontend/src/app/(dashboard)/competitors/[id]/competitor-detail-client.tsx`

- [ ] **Step 1: Read both files** + spec §6.1. Identify where verdict, wins/exposures/plays, and the `inferred` tags render.
- [ ] **Step 2: Art-direct.** Verdict sentence in `.font-display` (serif, ≥28px), competitor names emphasized in `--primary`; three columns Wins (win-green dot) / Exposures (risk-red dot) / Plays (blue dot) on depth-card surfaces; `ⓘ inferred` tags styled as small mono blue chips that reveal evidence on hover/expand (preserve existing behavior + data). Below: detected-changes timeline, complaints, signals — reskinned via tokens.
- [ ] **Step 3: Verify, BOTH themes** against spec §7 anti-slop checklist. Real data still renders; `inferred` evidence still reveals; contrast AA.
- [ ] **Step 4: Commit** `git commit -m "feat(head-to-head): art-direct the wow screen to Premium Blue"`

---

### Task 7: Tier 1 — Landing `/`

**Files:**
- Modify: `frontend/src/app/page.tsx` + its section components under `frontend/src/components/` (e.g. `pricing.tsx`, `how-it-works-panels.tsx`, `product-demo.tsx`, `local-business-section.tsx`, `review-intelligence.tsx`)

- [ ] **Step 1: Read `page.tsx`** to inventory sections + imported components.
- [ ] **Step 2: Art-direct the hero** — Instrument Serif headline (large), gradient primary "Start free" CTA, the live multi-competitor battle-card demo on a depth surface; reskin pricing ($49 SaaS / $19 Local), how-it-works, footer. Editorial asymmetry, one focal point — not an even grid.
- [ ] **Step 3: Verify, BOTH themes** vs §7. The 8 `sky-*` files here already follow `--primary`; confirm visually. No lorem/invented metrics (real copy only).
- [ ] **Step 4: Commit** `git commit -m "feat(landing): art-direct hero + sections to Premium Blue"`

---

### Task 8: Tier 1 — Dashboard

**Files:**
- Modify: `frontend/src/app/(dashboard)/dashboard/dashboard-client.tsx` (+ `dashboard-animator.tsx` for count-ups)

- [ ] **Step 1: Read both files** + spec §6.3. Consider shadcn's prebuilt dashboard/sidebar **blocks** re-themed (founder asked for "shadcn for dashboard components") rather than hand-rolling.
- [ ] **Step 2: Build** stat cards with **count-up** mono numerals + sparklines + typed change badges (`$` pricing / `+` feature / `↻` repositioning), a competitor-health grid (name, domain, last-scanned, change count, 4-pt sparkline, status), and the recent intel feed — all on depth cards. Count-ups via `motion/react`, no bounce.
- [ ] **Step 3: Verify, BOTH themes** vs §7. Count-ups animate once on load; real data intact.
- [ ] **Step 4: Commit** `git commit -m "feat(dashboard): Premium Blue stat cards + health grid"`

---

### Task 9: Tier 1 — Onboarding magic-moment modal

**Files:**
- Locate first: `cd frontend && grep -rEl "Analyze my business|Add your website|auto-discover|business profile" --include=*.tsx src` → modify the matched component (the first-run modal in the dashboard flow).

- [ ] **Step 1: Locate + read** the onboarding modal component (grep above). Confirm the two steps (URL input → analyze; review business profile + auto-discovered competitors).
- [ ] **Step 2: Art-direct** — large URL input, gradient "Analyze my business" CTA, a beautiful loading state (blue signal-pulse / shimmer, no bounce) for the 20–40s analyze, then the two-pane review (your profile | discovered competitors). Tokens only; Instrument Serif for the step headline.
- [ ] **Step 3: Verify, BOTH themes** vs §7. The analyze flow + discovered-competitor data still work end-to-end.
- [ ] **Step 4: Commit** `git commit -m "feat(onboarding): Premium Blue magic-moment modal"`

---

### Task 10: Cross-theme QA + production deploy

- [ ] **Step 1: Full build** `cd frontend && npm run build` — passes, no type errors.
- [ ] **Step 2: Browser QA sweep, BOTH themes** — every touched screen + the Tier-2 screens (Trends/Campaigns/Queue/Discover/Settings/Battlecards/share). Check: contrast AA on every surface, no flat cards, no raw-blue leaks, theme toggle clean (no chart desync), real data intact, Polar billing flow intact. Fix any regressions (commit per fix).
- [ ] **Step 3: Self-audit vs spec §7** — confirm each anti-slop item per screen; confirm `inferred`/provenance UI preserved.
- [ ] **Step 4: Deploy — FOUNDER-CONFIRMED ONLY.** Production is `main` → Vercel auto-deploy. After explicit confirmation: merge/push `style/design-polish` → `main`, watch the Vercel build, then smoke-check rivalscope.dev in both themes (load `/`, `/dashboard`, a `/share/[id]`).
- [ ] **Step 5: Final commit / PR** as the founder prefers.

---

## Self-Review (plan vs spec)

- **§3 token table →** Tasks 1–4 (type, color, depth, radius, gradient, motion utilities). ✓
- **§4 token mapping →** Tasks 1–3 cover every listed change; accent-propagation re-verified in Task 2 Step 2b. ✓
- **§5 Tier 0 →** Tasks 1–5 + gate. **Tier 1 →** Tasks 6–9. **Tier 2 deferral →** honored (only reskinned via Task 2, QA'd in Task 10). ✓
- **§6 signature components →** Head-to-Head (T6), stat cards/badges (T8), provenance/inferred tags (T6), signal motif (T5). Battle Card 4-quadrant bespoke is **Tier 2 (deferred)** — reskin-only today; flagged, not silent. ✓
- **§7 acceptance →** every screen task ends with a both-themes + checklist verify; Task 10 is the global gate + deploy. ✓
- **Placeholders:** none — Tier 0 has exact token code; Tier 1 has exact files + target + verify (bespoke markup written against live files at execution, by design). Onboarding path resolved by an exact grep in T9 Step 1.
- **Type consistency:** `--font-display`, `--gradient-primary`, `--shadow-card(-hover)` named once and reused verbatim across tasks. ✓
