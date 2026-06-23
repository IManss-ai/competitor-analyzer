# shadcn Neutral-Modern Re-theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-theme the entire Rivalscope frontend (landing + auth + ~12 dashboard screens) from the v4 "Signal Desk" look to a clean shadcn/ui neutral-modern aesthetic (zinc neutrals, single blue accent, Geist, 0.5rem radius, dark-first light/dark) without breaking any behavior.

**Architecture:** Approach A. Stand up shadcn's token layer in `globals.css` and **alias the existing custom CSS-var tokens to it**, so the whole app's palette/radius/borders shift at once and existing components keep rendering. Then replace hand-rolled components with shadcn primitives and restyle bespoke pieces screen-by-screen. Retire the alias layer at the end.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui (new-york), Radix, CVA, clsx + tailwind-merge, lucide-react, Geist font, Framer Motion (`motion/react`), Recharts.

**Spec:** `docs/superpowers/specs/2026-06-23-shadcn-retheme-design.md`

## Global Constraints

- Work on branch **`feat/shadcn-retheme`** (off `main`). Never push to `main` during this work; verify on a **Vercel preview**; deploy deliberately at the end.
- Frontend root is `frontend/`. All `npm`/`npx` run from `frontend/`.
- **Verification gate per task:** `npm run build` must pass (TypeScript + Next lint + rules-of-hooks) AND a light + dark screenshot review of the touched surface. Backend (`./venv/bin/python -m unittest ...`) is untouched — do not modify it.
- **Do not change behavior:** no API calls, props, routes, handlers, or copy may change. This is skin-only. The `userId`/`apiToken` auth props and all `onClick`/form logic stay exactly as they are.
- Single accent = **blue**. Used only on primary buttons, links, focus/active, selected/checked. Never as a content-surface wash or decorative fill.
- Radius **0.5rem** (tunable once in P0). Neutrals **zinc**. Style **new-york**. Light + dark both, **dark-first default** (fresh visitor → `.dark`; saved choice persists).
- Theme is the **`.dark` class** on `<html>` (shadcn convention), replacing `data-theme="ink|paper"`.
- Commit after every task. Conventional commits, `style(theme):` / `feat(theme):` / `chore(theme):` prefixes.

---

## File Structure (what this plan touches)

**Foundation (P0):**
- Create: `frontend/components.json`, `frontend/src/components/ui/*` (CLI-generated shadcn primitives)
- Modify: `frontend/src/lib/utils.ts` (add `cn`), `frontend/src/app/globals.css` (token layer + aliases), `frontend/src/app/layout.tsx` (Geist + pre-paint `.dark` script), `frontend/src/lib/use-theme.ts` (toggle `.dark`), the theme toggle component, `frontend/package.json` (deps)
- Modify/replace: `frontend/src/components/ui/button.tsx | label.tsx | switch.tsx`

**Per-surface (P1-P3):** the page + client + section/component files for each surface (enumerated per task).

**Cleanup (P4):** `globals.css` (remove aliases), `DESIGN.md`, `CLAUDE.md`, e2e re-run.

---

## Phase P0 — Foundation (the whole app visually shifts here)

### Task 0.1: Branch + shadcn init + toolchain proof

**Files:** Create `frontend/components.json`; modify `frontend/package.json`, `frontend/src/lib/utils.ts`.

- [ ] **Step 1: Create the branch from latest main**
```bash
cd /var/www/html/competitor-analyzer
git checkout main && git pull --ff-only
git checkout -b feat/shadcn-retheme
```

- [ ] **Step 2: Init shadcn (non-destructive; answer prompts new-york / zinc / CSS variables)**
```bash
cd frontend
npx shadcn@latest init
# Style: New York · Base color: Zinc · CSS variables: yes
```
Expected: writes `components.json`, adds `tailwind-merge`, may inject a zinc token block into `globals.css` and a `cn` into `lib/utils.ts`. If the CLI errors on Tailwind v4 / React 19, retry with `npx shadcn@canary init`. If it still fails, STOP and report — do not hand-fake `components.json`; the canary CLI is the supported path.

- [ ] **Step 3: Add one primitive to prove the toolchain end-to-end**
```bash
npx shadcn@latest add button
```
Expected: `src/components/ui/button.tsx` written (shadcn version). (This will collide with the existing hand-rolled `button.tsx` — accept the overwrite; we replace it in Task 0.6.)

- [ ] **Step 4: Build to confirm the toolchain compiles**
```bash
npm run build
```
Expected: PASS (✓ Compiled successfully). If it fails, resolve the toolchain issue here before going further.

- [ ] **Step 5: Commit**
```bash
git add frontend/components.json frontend/package.json frontend/package-lock.json frontend/src/lib/utils.ts frontend/src/components/ui/button.tsx
git commit -m "chore(theme): shadcn init (new-york/zinc) + toolchain proof"
```

### Task 0.2: `cn()` helper confirmed

**Files:** Modify `frontend/src/lib/utils.ts`.

- [ ] **Step 1: Ensure `cn` exists exactly as shadcn expects**

`frontend/src/lib/utils.ts` must contain (keep any existing exports below it):
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Build**
```bash
npm run build
```
Expected: PASS.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/lib/utils.ts
git commit -m "chore(theme): cn() helper (clsx + tailwind-merge)"
```

**Interfaces produced:** `cn(...inputs: ClassValue[]): string` — every shadcn primitive and restyle uses this.

### Task 0.3: Token layer — blue override + legacy aliases (the global shift)

**Files:** Modify `frontend/src/app/globals.css`.

**Interfaces consumed:** the zinc token set written by `shadcn init` (`--background --foreground --card --popover --primary --secondary --muted --accent --destructive --border --input --ring --radius --chart-1..5 --sidebar*` in `:root` and `.dark`).

**Interfaces produced:** legacy token names (`--surface-base`, `--text-primary`, `--accent-primary`, etc.) resolve to shadcn tokens so existing markup renders the new theme.

- [ ] **Step 1: Set radius and override `--primary` to blue in both themes**

In `globals.css`, in the `:root` block set `--radius: 0.5rem;` and override:
```css
:root {
  /* ...zinc tokens from shadcn init... */
  --radius: 0.5rem;
  --primary: oklch(0.546 0.245 262.881);        /* blue-600 (tunable) */
  --primary-foreground: oklch(0.985 0 0);
  --ring: oklch(0.546 0.245 262.881);
}
.dark {
  /* ...zinc dark tokens from shadcn init... */
  --primary: oklch(0.623 0.214 259.815);         /* brighter blue for dark (tunable) */
  --primary-foreground: oklch(0.985 0 0);
  --ring: oklch(0.623 0.214 259.815);
}
```

- [ ] **Step 2: Add the legacy alias layer** (append inside `:root` and `.dark` respectively, or in a shared block that reads the resolved vars)

```css
:root {
  /* --- legacy Signal Desk token aliases → shadcn tokens (retired in P4) --- */
  --surface-base: var(--background);
  --surface-raised: var(--card);
  --surface-overlay: var(--popover);
  --surface-subtle: var(--muted);
  --fill-subtle: var(--muted);
  --fill-subtle-hover: var(--accent);
  --text-primary: var(--foreground);
  --text-secondary: var(--muted-foreground);
  --text-muted: var(--muted-foreground);
  --border-default: var(--border);
  --border-subtle: var(--border);
  --hairline: var(--border);
  --border-strong: var(--input);
  --accent-primary: var(--primary);
  --accent-cta: var(--primary);
  --accent-cta-hover: var(--primary);
  --accent-hover: var(--primary);
  --accent-text: var(--primary-foreground);
  --accent-subtle: var(--accent);
  --accent-border: var(--ring);
  --accent-deep: var(--primary);
  --radius-sm: calc(var(--radius) - 2px);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) + 4px);
  --radius-xl: calc(var(--radius) + 8px);
}
```
(The `.dark` block inherits these aliases since they reference vars that `.dark` redefines — define the alias block ONCE in `:root`; only the underlying shadcn tokens differ per theme.)

- [ ] **Step 3: Re-point the Tailwind `sky-*` remap to `--primary`**

Find the existing `--color-sky-*` remap in `globals.css` and set the accent-range entries (`sky-400..700`, `sky-950`) to resolve from `--primary` / `--accent` so existing `sky-*` utilities render the new blue. Minimal: `--color-sky-500: var(--primary);` and neutralize `--color-sky-950: var(--card);`.

- [ ] **Step 4: Build + screenshot the whole app shifted**
```bash
npm run build
```
Expected: PASS. Then run the dev server (`npm run dev`) or a preview and screenshot the landing + one dashboard screen in light and dark. The palette should now read neutral-zinc with blue accents (structure still Signal-Desk-shaped — that's expected pre-restyle).

- [ ] **Step 5: Commit**
```bash
git add frontend/src/app/globals.css
git commit -m "feat(theme): shadcn token layer + blue primary + legacy aliases (global shift)"
```

### Task 0.4: Geist fonts

**Files:** Modify `frontend/src/app/layout.tsx`, `frontend/package.json`, `frontend/src/app/globals.css`.

- [ ] **Step 1: Install Geist**
```bash
npm install geist
```

- [ ] **Step 2: Wire Geist in `layout.tsx`** — replace the Space Grotesk/IBM Plex Mono `next/font` setup with:
```tsx
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
// on <html>: className={`${GeistSans.variable} ${GeistMono.variable}`}
```

- [ ] **Step 3: Point the font CSS vars at Geist** in `globals.css` — set `--font-sans: var(--font-geist-sans);` `--font-mono: var(--font-geist-mono);` and alias the legacy `--font-archivo: var(--font-geist-sans);` so existing references keep working.

- [ ] **Step 4: Build + screenshot**
```bash
npm run build
```
Expected: PASS; type renders as Geist.

- [ ] **Step 5: Commit**
```bash
git add frontend/src/app/layout.tsx frontend/src/app/globals.css frontend/package.json frontend/package-lock.json
git commit -m "feat(theme): switch typography to Geist Sans + Mono"
```

### Task 0.5: Theme switch → `.dark` class, dark-first

**Files:** Modify `frontend/src/app/layout.tsx` (pre-paint script), `frontend/src/lib/use-theme.ts`, the theme-toggle component(s) (topbar + landing nav + login), `frontend/src/lib/chart-theme.ts`.

- [ ] **Step 1: Pre-paint script (dark-first)** — in `layout.tsx`, replace the `data-theme` FOUC script with one that adds `.dark` by default unless a saved light choice exists:
```tsx
<script dangerouslySetInnerHTML={{ __html:
  `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})()`
}} />
```

- [ ] **Step 2: Rewrite `use-theme.ts`** to read/write `localStorage 'theme'` ∈ `{'dark','light'}` (default `'dark'`) and toggle `document.documentElement.classList.toggle('dark', theme==='dark')`. Keep the same hook return shape the toggle consumes (e.g. `{ theme, setTheme, toggle }`) so the toggle components don't change their call sites.

- [ ] **Step 3: Update the toggle UI** (topbar + landing nav + login) — labels/icons reflect dark/light (sun/moon) instead of paper/ink. No behavior change beyond the new values.

- [ ] **Step 4: Re-point `chart-theme.ts`** `useChartPalette()` to read the new `--chart-1..5` tokens.

- [ ] **Step 5: Build + screenshot toggle in both states**
```bash
npm run build
```
Expected: PASS; fresh load = dark; toggling flips `.dark`; reload persists.

- [ ] **Step 6: Commit**
```bash
git add frontend/src/app/layout.tsx frontend/src/lib/use-theme.ts frontend/src/lib/chart-theme.ts frontend/src/components/  # toggle files
git commit -m "feat(theme): dark-first .dark-class theme switching"
```

### Task 0.6: Core primitives + replace hand-rolled ui/*

**Files:** Create/overwrite `frontend/src/components/ui/*`; update imports where `ui/button|label|switch` were imported.

- [ ] **Step 1: Add the core primitive set**
```bash
npx shadcn@latest add button input label textarea card dialog alert-dialog dropdown-menu select tabs badge switch checkbox sonner tooltip separator skeleton table sheet avatar popover scroll-area
```
Expected: each written to `src/components/ui/`.

- [ ] **Step 2: Reconcile the 3 hand-rolled primitives** — `button.tsx`, `label.tsx`, `switch.tsx` are now shadcn versions. Check every import site still type-checks (shadcn `Button` supports `variant`/`size`/`asChild`; map old props: a primary button → `<Button>`, a ghost → `<Button variant="ghost">`, etc.).

- [ ] **Step 3: Mount the Toaster** — add `<Toaster />` (sonner) once in `layout.tsx` or the dashboard layout.

- [ ] **Step 4: Build**
```bash
npm run build
```
Expected: PASS (fix any prop/type mismatches from the primitive swap).

- [ ] **Step 5: Commit**
```bash
git add frontend/src/components/ui frontend/src/app/layout.tsx
git commit -m "feat(theme): add shadcn primitives; replace hand-rolled button/label/switch"
```

### Task 0.7: P0 verification gate

- [ ] **Step 1: Full build** — `npm run build` PASS.
- [ ] **Step 2: Screenshot the landing + login + dashboard in light AND dark.** Confirm: neutral-zinc surfaces, blue primary buttons/links, Geist type, 0.5rem radius, dark-first on fresh load. Structure is still Signal-Desk-shaped (expected — restyle is P1-P3).
- [ ] **Step 3: Commit any token tuning** (e.g., adjust the blue oklch for AA). `git commit -m "style(theme): P0 token tuning"`.

> **Do not deploy after P0.** The app is mid-migration (recolored but not restyled).

---

## Phase P1 — Landing (marketing surface)

> Per-task pattern for P1-P3: open the surface, replace any inline/hand-rolled primitives with shadcn ones, restyle the bespoke markup to the neutral-modern feel (soft bordered cards `border bg-card` + optional `shadow-sm`, `rounded-[var(--radius)]`, more whitespace, drop mono-uppercase eyebrows and hairline-on-navy density), `npm run build`, screenshot light+dark, commit. Behavior/props unchanged.

### Task 1.1: Landing page shell + hero
**Files:** Modify `frontend/src/app/page.tsx`, `frontend/src/components/ui/hero-rotating-word.tsx`.
- [ ] Restyle hero (headline, sub, CTA group, the live "Intel Feed" demo card) to neutral-modern: `Button` for CTAs, `Card` for the feed demo, zinc text tokens, blue accent only on the CTA + live dot. Keep the `motion/react` animations and copy.
- [ ] `npm run build` PASS; screenshot light+dark.
- [ ] Commit: `style(theme): re-theme landing hero`.

### Task 1.2: Landing sections
**Files:** Modify `frontend/src/components/ui/how-it-works-panels.tsx`, `product-demo.tsx`, `pricing.tsx`, `pricing-demo.tsx`.
- [ ] Restyle the "change detection → playbook" panels, the product demo frame, and the pricing cards to shadcn `Card`/`Badge`/`Button`, soft borders, whitespace. Drop the sharp/flat editorial treatment.
- [ ] `npm run build` PASS; screenshot the full landing scroll in light+dark.
- [ ] Commit: `style(theme): re-theme landing sections (how-it-works, product, pricing)`.

---

## Phase P2 — Auth + dashboard shell

### Task 2.1: Auth screens
**Files:** Modify `frontend/src/app/(auth)/auth/login/page.tsx`, `frontend/src/app/(auth)/auth/verify/page.tsx`.
- [ ] Rebuild the login form with shadcn `Card`/`Input`/`Label`/`Button`; keep the two-pane editorial split or simplify to a centered card (neutral-modern leans centered card). Keep the plan-badge + "account created on first sign-in" copy and ALL form logic (direct-login fetch, validation).
- [ ] `npm run build` PASS; screenshot login (with `?plan=saas`) light+dark.
- [ ] Commit: `style(theme): re-theme auth screens`.

### Task 2.2: Dashboard shell
**Files:** Modify `frontend/src/app/(dashboard)/layout.tsx`, `frontend/src/components/sidebar.tsx`, `frontend/src/components/topbar.tsx`, `frontend/src/components/main-content.tsx`.
- [ ] Restyle the sidebar (neutral surface, blue active item, zinc text, `Separator`s), topbar, and main content frame. Mobile nav → shadcn `Sheet`. Keep the `ApiTokenProvider` wrapper and all nav/session logic untouched.
- [ ] `npm run build` PASS; screenshot the shell (desktop + 375px mobile) light+dark.
- [ ] Commit: `style(theme): re-theme dashboard shell + sidebar`.

---

## Phase P3 — Dashboard screens (one task each)

> Each task: restyle the page + its `-client.tsx` to shadcn primitives + neutral-modern; preserve every fetch/handler/prop (incl. `userId`/`apiToken`); `npm run build` PASS; screenshot light+dark; commit `style(theme): re-theme <screen>`.

- [ ] **Task 3.1 — Dashboard** (`(dashboard)/dashboard/page.tsx` + `dashboard-client.tsx`): KPI/stat cards → `Card`; intel feed rows; charts via `useChartPalette` (Recharts colors from `--chart-*`).
- [ ] **Task 3.2 — Competitors** (`competitors/page.tsx` + `competitor-manager.tsx`): add-competitor form → `Input`/`Button`; competitor cards; empty state; quick-add chips → `Badge`/`Button`.
- [ ] **Task 3.3 — Competitor detail** (`competitors/[id]/page.tsx` + `competitor-detail-client.tsx`): detail header, scan button, tabs → `Tabs`.
- [ ] **Task 3.4 — Battle cards** (`battlecards/page.tsx` + `battlecards-client.tsx`, `components/battle-card.tsx`, `battle-card-content.tsx`): the 4-quadrant card + playbook → `Card`/`Badge`; copy-to-clipboard buttons → `Button variant="ghost"`; loading → `Skeleton`.
- [ ] **Task 3.5 — Queue** (`queue/page.tsx` + `queue-manager.tsx`): action rows, approve/edit → `Button`/`Dialog`; the read-only-trial gating UI stays.
- [ ] **Task 3.6 — Trends** (`trends/page.tsx`): charts via `useChartPalette`; `Card` containers.
- [ ] **Task 3.7 — Campaigns** (`campaigns/page.tsx` + `campaigns-client.tsx`, `campaigns/[id]/war-room-client.tsx`): list + war-room → `Card`/`Tabs`.
- [ ] **Task 3.8 — Discover** (`discover/page.tsx` + client): search input, results grid, the sort gate.
- [ ] **Task 3.9 — Settings** (`settings/page.tsx` + `settings-client.tsx`, `data-sources-panel.tsx`): tabbed settings → `Tabs`; toggles → `Switch`; billing section; danger zone → `AlertDialog`. Keep the `apiToken` prop wiring.
- [ ] **Task 3.10 — Billing/checkout** (`billing/checkout/page.tsx`, `billing/success/page.tsx`): the "checkout almost ready" / success states → `Card`/`Button`.

---

## Phase P4 — Cleanup, docs, e2e

### Task 4.1: Retire the legacy alias layer
**Files:** Modify `frontend/src/app/globals.css`; grep-driven sweeps of any remaining legacy-token / `sky-*` / `data-theme` usages.
- [ ] **Step 1:** `grep -rn "var(--surface-\|var(--text-\|var(--accent-\|data-theme=\|sky-" frontend/src` — replace remaining legacy-token usages with shadcn tokens, remove the alias block from `globals.css`, delete dead Signal-Desk CSS.
- [ ] **Step 2:** `npm run build` PASS; full light+dark screenshot sweep of every surface to confirm nothing regressed when aliases were removed.
- [ ] **Step 3:** Commit: `chore(theme): retire legacy Signal Desk token aliases`.

### Task 4.2: Rewrite design docs
**Files:** Modify `DESIGN.md`, `CLAUDE.md` (design section).
- [ ] Replace DESIGN.md with the shadcn neutral-modern system (tokens, blue accent, Geist, 0.5rem, dark-first, component conventions). Update CLAUDE.md's design section to point at it.
- [ ] Commit: `docs(design): replace Signal Desk with shadcn neutral-modern system`.

### Task 4.3: Functional + visual verification
- [ ] **Step 1:** Backend suite still green (sanity, should be untouched): `cd /var/www/html/competitor-analyzer && ./venv/bin/python -m unittest discover -s tests -p "test_*.py"` → OK.
- [ ] **Step 2:** Browser e2e on a Vercel **preview** of `feat/shadcn-retheme`: login → dashboard → add competitor → scan → battle card, light+dark. Confirm no functional regressions.
- [ ] **Step 3:** A `/design-review`-style pass against the new shadcn look; fix any findings.
- [ ] **Step 4:** Open a PR `feat/shadcn-retheme` → main with before/after screenshots. Deliberate deploy after review (the spec's "verify on preview, not a casual push").

---

## Self-Review (done at authoring)

- **Spec coverage:** foundation (P0: init, cn, tokens+aliases, Geist, .dark theme, primitives) ✓; landing (P1) ✓; auth+shell (P2) ✓; all enumerated dashboard screens (P3.1-3.10) ✓; cleanup/aliases/docs/e2e (P4) ✓. Theme-switch, typography, token mapping, dark-first all have tasks.
- **Placeholders:** none — the visual per-screen tasks intentionally specify the surface + primitives + gate rather than fabricated final JSX (honest for a restyle); P0 has exact code where it's knowable.
- **Type consistency:** `cn()` signature defined in 0.2 and used throughout; the hook return shape note in 0.5 keeps toggle call sites stable; the "preserve `userId`/`apiToken` props" constraint is repeated where those components are touched.
