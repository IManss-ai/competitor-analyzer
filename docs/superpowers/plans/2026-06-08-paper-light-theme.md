# Paper-Light Theme + Theme Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a paper-light theme and a topbar/landing-nav toggle so Rivalscope renders in paper (light) or ink (dark), defaulting to the visitor's OS preference with a persisted override, while the ink theme stays visually identical to today.

**Architecture:** A single `data-theme` attribute on `<html>` is the source of truth. `:root` holds paper tokens (default); `html[data-theme="ink"]` overrides with today's ink values verbatim; a `@media (prefers-color-scheme: dark) :root:not([data-theme])` block makes a dark-OS first visit render ink with zero JS. An inline pre-paint script (per this Next 16 fork's `preventing-flash-before-hydration` guide) applies a saved preference before first paint. A `useTheme` hook drives a `ThemeToggle`. Then a per-screen sweep replaces hardcoded dark literals (gray utilities, inline `rgba(255,255,255,…)`, Recharts hex) with theme-aware tokens.

**Tech Stack:** Next.js 16.2.7 (App Router, customized fork — see `frontend/AGENTS.md`), React, Tailwind CSS v4, Recharts, TypeScript.

---

## Pre-flight (read before starting)

- `frontend/AGENTS.md`: "This is NOT the Next.js you know." Before editing `layout.tsx`, the inline-script pattern follows `node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md` (already distilled into Task 3).
- Work on a branch: `git checkout -b redesign/paper-light-theme`.
- Token values come from `DESIGN.md` (Paper + Ink columns). Do not invent values.
- Build command (the universal verification): `cd frontend && npm run build`. It must stay green after every task.
- Visual QA uses the gstack `browse` skill against `npm run dev` (port noted at run time).

**Token value reference (from `DESIGN.md`):**

| Token | Paper (`:root`) | Ink (`[data-theme="ink"]`) |
|-------|-----------------|----------------------------|
| `--surface-base` | `#f5f2ec` | `#16140f` |
| `--surface-raised` | `#ffffff` | `#1f1c16` |
| `--surface-overlay` | `#ffffff` | `#211e17` |
| `--surface-subtle` | `#fbf9f5` | `#26221a` |
| `--text-primary` | `#1a1714` | `#eae6dd` |
| `--text-secondary` | `#6b6258` | `#a8a094` |
| `--text-muted` | `#9a9186` | `#6f685c` |
| `--border-default` | `rgba(26,23,20,0.12)` | `rgba(234,230,221,0.14)` |
| `--border-subtle` | `rgba(26,23,20,0.07)` | `rgba(234,230,221,0.07)` |
| `--border-strong` | `rgba(26,23,20,0.22)` | `rgba(234,230,221,0.24)` |
| `--accent-primary` | `#345781` | `#4f7cb0` |
| `--accent-hover` | `#2c4868` | `#6a96c8` |
| `--accent-subtle` | `rgba(52,87,129,0.10)` | `rgba(79,124,176,0.12)` |
| `--accent-border` | `rgba(52,87,129,0.30)` | `rgba(79,124,176,0.34)` |
| `--accent-glow` | `rgba(52,87,129,0.18)` | `rgba(79,124,176,0.25)` |
| `--hairline` (new) | `rgba(26,23,20,0.06)` | `rgba(234,230,221,0.06)` |
| `--fill-subtle` (new) | `rgba(26,23,20,0.03)` | `rgba(234,230,221,0.04)` |
| `--fill-subtle-hover` (new) | `rgba(26,23,20,0.05)` | `rgba(234,230,221,0.07)` |

**File structure (created / modified):**
- Create: `frontend/src/lib/use-theme.ts` — read/write theme, OS fallback.
- Create: `frontend/src/components/theme-toggle.tsx` — the switch.
- Create: `frontend/src/components/inline-script.tsx` — SSR/CSR-safe inline script helper (from the Next guide).
- Create: `frontend/src/lib/chart-theme.ts` — theme-aware chart color tokens.
- Modify: `frontend/src/app/globals.css` — token restructure + new tokens + OS fallback.
- Modify: `frontend/src/app/layout.tsx` — pre-paint script + `suppressHydrationWarning`.
- Modify: `frontend/src/components/topbar.tsx` — mount toggle.
- Modify (sweep): the chart + screen files enumerated in Phase 2.

---

# PHASE 1 — Foundation (tokens, plumbing, toggle)

## Task 1: Branch + baseline ink snapshot

**Files:** none (git + screenshots).

- [ ] **Step 1: Create the branch**

Run:
```bash
cd /var/www/html/competitor-analyzer && git checkout -b redesign/paper-light-theme
```
Expected: `Switched to a new branch 'redesign/paper-light-theme'`.

- [ ] **Step 2: Capture the current ink look as the regression baseline**

Run `cd frontend && npm run dev` (note the port), then use the gstack `browse` skill to screenshot `/`, `/dashboard`, `/trends`, and a competitor detail page. Save them as the "ink must look identical to this" reference. Stop the dev server when done.
Expected: 4 reference screenshots of the current dark UI.

- [ ] **Step 3: Commit the branch point (no code yet)**

```bash
git commit --allow-empty -m "chore: start paper-light theme branch"
```

---

## Task 2: Token restructure in `globals.css`

**Files:**
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Move ink values into a `[data-theme="ink"]` block and make `:root` paper**

In `globals.css`, the current `:root` (lines ~49–120) holds ink values. Replace the surface/border/text/accent groups in `:root` with the **paper** column, and add a new `html[data-theme="ink"]` block (placed immediately after `:root`) holding the **ink** column verbatim. Concretely, `:root` becomes:

```css
:root {
  /* ── Tailwind HSL bridge (paper) ─────────────────────── */
  --background:           40 30% 94%;   /* #f5f2ec */
  --foreground:           30 11% 9%;    /* #1a1714 */
  --card:                 0 0% 100%;
  --card-foreground:      30 11% 9%;
  --popover:              0 0% 100%;
  --popover-foreground:   30 11% 9%;
  --primary:              212 42% 36%;  /* #345781 */
  --primary-foreground:   40 30% 96%;
  --secondary:            40 20% 92%;
  --secondary-foreground: 30 11% 9%;
  --muted:                40 20% 92%;
  --muted-foreground:     30 7% 56%;    /* #9a9186 */
  --accent:               212 42% 36%;
  --accent-foreground:    30 11% 9%;
  --destructive:          0 60% 45%;
  --destructive-foreground: 0 0% 100%;
  --border:               30 12% 86%;
  --input:                30 12% 88%;
  --ring:                 212 42% 36%;

  /* ── Fonts (unchanged) ───────────────────────────────── */
  --font-sans:  var(--font-archivo), system-ui, sans-serif;
  --font-mono:  var(--font-ibm-plex-mono), ui-monospace, monospace;
  --sidebar-width: 240px;

  /* ── Surfaces (paper) ────────────────────────────────── */
  --surface-base:    #f5f2ec;
  --surface-raised:  #ffffff;
  --surface-overlay: #ffffff;
  --surface-subtle:  #fbf9f5;

  /* ── Borders (paper) ─────────────────────────────────── */
  --border-default: rgba(26,23,20,0.12);
  --border-subtle:  rgba(26,23,20,0.07);
  --border-strong:  rgba(26,23,20,0.22);

  /* ── Text (paper) ────────────────────────────────────── */
  --text-primary:   #1a1714;
  --text-secondary: #6b6258;
  --text-muted:     #9a9186;

  /* ── Accent — slate-blue (paper, darker for contrast) ── */
  --accent-primary: #345781;
  --accent-hover:   #2c4868;
  --accent-subtle:  rgba(52,87,129,0.10);
  --accent-border:  rgba(52,87,129,0.30);
  --accent-glow:    rgba(52,87,129,0.18);

  /* ── De-hardcoded fills (new, theme-aware) ───────────── */
  --hairline:           rgba(26,23,20,0.06);
  --fill-subtle:        rgba(26,23,20,0.03);
  --fill-subtle-hover:  rgba(26,23,20,0.05);

  /* ── Radius (unchanged) ──────────────────────────────── */
  --radius-sm: 2px; --radius-md: 4px; --radius-lg: 6px; --radius-xl: 8px; --radius-pill: 9999px;

  /* ── Shadow — paper stays flat ───────────────────────── */
  --shadow-card:       none;
  --shadow-card-hover: none;
  --shadow-elevated:   0 8px 24px rgba(26,23,20,0.10), 0 2px 6px rgba(26,23,20,0.06);
  --shadow-modal:      0 24px 60px rgba(26,23,20,0.18), 0 4px 14px rgba(26,23,20,0.10);

  /* ── Motion (unchanged) ──────────────────────────────── */
  --ease-smooth: cubic-bezier(0.16,1,0.3,1);
  --ease-out:    cubic-bezier(0.0,0.0,0.2,1);
  --duration-fast: 100ms; --duration-base: 160ms; --duration-slow: 240ms;
}

html[data-theme="ink"] {
  --background: 40 22% 7%;  --foreground: 40 22% 89%;
  --card: 40 16% 11%;       --card-foreground: 40 22% 89%;
  --popover: 40 18% 9%;     --popover-foreground: 40 22% 89%;
  --primary: 212 38% 50%;   --primary-foreground: 40 30% 96%;
  --secondary: 40 12% 14%;  --secondary-foreground: 40 22% 89%;
  --muted: 40 12% 12%;      --muted-foreground: 38 10% 45%;
  --accent: 212 38% 50%;    --accent-foreground: 40 22% 89%;
  --destructive: 0 60% 50%; --destructive-foreground: 0 0% 100%;
  --border: 40 12% 18%;     --input: 40 12% 15%;  --ring: 212 38% 50%;

  --surface-base: #16140f;  --surface-raised: #1f1c16;
  --surface-overlay: #211e17; --surface-subtle: #26221a;
  --border-default: rgba(234,230,221,0.14);
  --border-subtle:  rgba(234,230,221,0.07);
  --border-strong:  rgba(234,230,221,0.24);
  --text-primary: #eae6dd; --text-secondary: #a8a094; --text-muted: #6f685c;
  --accent-primary: #4f7cb0; --accent-hover: #6a96c8;
  --accent-subtle: rgba(79,124,176,0.12);
  --accent-border: rgba(79,124,176,0.34);
  --accent-glow:   rgba(79,124,176,0.25);
  --hairline: rgba(234,230,221,0.06);
  --fill-subtle: rgba(234,230,221,0.04);
  --fill-subtle-hover: rgba(234,230,221,0.07);
  --shadow-elevated: 0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.4);
  --shadow-modal:    0 24px 64px rgba(0,0,0,0.65), 0 4px 16px rgba(0,0,0,0.5);
}
```

- [ ] **Step 2: Add the OS-default fallback (dark OS, no saved pref → ink, zero JS)**

Immediately after the `html[data-theme="ink"]` block, add:

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --background: 40 22% 7%;  --foreground: 40 22% 89%;
    --card: 40 16% 11%;       --card-foreground: 40 22% 89%;
    --popover: 40 18% 9%;     --popover-foreground: 40 22% 89%;
    --primary: 212 38% 50%;   --primary-foreground: 40 30% 96%;
    --secondary: 40 12% 14%;  --secondary-foreground: 40 22% 89%;
    --muted: 40 12% 12%;      --muted-foreground: 38 10% 45%;
    --accent: 212 38% 50%;    --accent-foreground: 40 22% 89%;
    --border: 40 12% 18%;     --input: 40 12% 15%;  --ring: 212 38% 50%;
    --surface-base: #16140f;  --surface-raised: #1f1c16;
    --surface-overlay: #211e17; --surface-subtle: #26221a;
    --border-default: rgba(234,230,221,0.14);
    --border-subtle:  rgba(234,230,221,0.07);
    --border-strong:  rgba(234,230,221,0.24);
    --text-primary: #eae6dd; --text-secondary: #a8a094; --text-muted: #6f685c;
    --accent-primary: #4f7cb0; --accent-hover: #6a96c8;
    --accent-subtle: rgba(79,124,176,0.12);
    --accent-border: rgba(79,124,176,0.34);
    --accent-glow:   rgba(79,124,176,0.25);
    --hairline: rgba(234,230,221,0.06);
    --fill-subtle: rgba(234,230,221,0.04);
    --fill-subtle-hover: rgba(234,230,221,0.07);
  }
}
```

- [ ] **Step 3: Make the remapped `sky-*` accent scale theme-aware**

The `@theme` block (lines ~36–46) hard-sets `--color-sky-*`. `@theme` values are the paper defaults; override the key steps for ink. After the `html[data-theme="ink"]` block add:

```css
html[data-theme="ink"] {
  --color-sky-400: #6a96c8; --color-sky-500: #4f7cb0; --color-sky-600: #3f6a9c;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --color-sky-400: #6a96c8; --color-sky-500: #4f7cb0; --color-sky-600: #3f6a9c;
  }
}
```

Then change the `@theme` `--color-sky-*` values to the **paper** (darker) ramp so light mode passes contrast: `--color-sky-400: #4f7cb0; --color-sky-500: #345781; --color-sky-600: #2c4868;` (leave 50–300 and 700–950 as-is).

- [ ] **Step 4: Flip `color-scheme` per theme and de-hardcode base CSS literals**

In the base block, change `html { color-scheme: dark; }` to `color-scheme: light;` and add:
```css
html[data-theme="ink"] { color-scheme: dark; }
@media (prefers-color-scheme: dark) { :root:not([data-theme]) { color-scheme: dark; } }
```
Replace the warm-white literals in component classes with the new tokens:
- `.rs-input` `background: rgba(234,230,221,0.04)` → `var(--fill-subtle)`.
- `.rs-btn-ghost:hover` `background: rgba(234,230,221,0.05)` → `var(--fill-subtle-hover)`.
- `.rs-skeleton` gradient stops `rgba(234,230,221,0.04|0.07)` → `var(--fill-subtle)` / `var(--fill-subtle-hover)`.
- Scrollbar thumb `rgba(234,230,221,0.10|0.18)` → `var(--border-strong)` (thumb) and a hover variant; acceptable on both themes.

- [ ] **Step 5: Verify the build compiles**

Run: `cd frontend && npm run build`
Expected: build succeeds, no CSS errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "feat(theme): paper tokens as default, ink as [data-theme=ink], OS fallback"
```

---

## Task 3: Pre-paint script + `useTheme` hook

**Files:**
- Create: `frontend/src/components/inline-script.tsx`
- Create: `frontend/src/lib/use-theme.ts`
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Create the SSR/CSR-safe inline script helper**

Per the Next fork's `preventing-flash-before-hydration` guide, create `frontend/src/components/inline-script.tsx`:

```tsx
// Runs synchronously during HTML parse on hard loads; inert (text/plain) on the client.
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

- [ ] **Step 2: Add the pre-paint theme script to `layout.tsx`**

In `frontend/src/app/layout.tsx`: import the helper, add `suppressHydrationWarning` to the `<html>` element (the script mutates its `data-theme`), and render the script as the first child of `<body>`:

```tsx
import { InlineScript } from '@/components/inline-script';
// ...
<html
  lang="en"
  data-scroll-behavior="smooth"
  suppressHydrationWarning
  className={`${archivo.variable} ${ibmPlexMono.variable} h-full antialiased`}
>
  <body className={`${archivo.variable} font-sans antialiased min-h-full text-[var(--text-primary)] selection:bg-sky-500/20 selection:text-sky-50`} style={{ backgroundColor: 'var(--surface-base)' }}>
    <InlineScript html={`try{var t=localStorage.getItem('theme');if(t==='ink'||t==='paper'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}`} />
    {children}
  </body>
</html>
```
A saved pref sets `data-theme` before paint; no saved pref leaves `:root` untouched so the CSS media query decides. No saved pref + light OS → paper.

- [ ] **Step 3: Create the `useTheme` hook**

Create `frontend/src/lib/use-theme.ts`:

```tsx
'use client';
import { useCallback, useEffect, useState } from 'react';

export type Theme = 'paper' | 'ink';

function readEffectiveTheme(): Theme {
  if (typeof window === 'undefined') return 'paper';
  const saved = localStorage.getItem('theme');
  if (saved === 'ink' || saved === 'paper') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'ink' : 'paper';
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('paper');

  // Sync to the real effective theme after mount (avoids hydration mismatch).
  useEffect(() => { setThemeState(readEffectiveTheme()); }, []);

  // Follow OS changes only while the user has no explicit saved preference.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (!localStorage.getItem('theme')) {
        const next: Theme = mq.matches ? 'ink' : 'paper';
        setThemeState(next);
        if (next === 'paper') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', 'ink');
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem('theme', next);
    if (next === 'paper') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', 'ink');
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => {
    setTheme(readEffectiveTheme() === 'ink' ? 'paper' : 'ink');
  }, [setTheme]);

  return { theme, setTheme, toggle };
}
```
Note: paper is represented by the **absence** of `data-theme` (so `:root` + OS fallback stay coherent); ink sets the attribute explicitly.

- [ ] **Step 4: Verify the build compiles**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/inline-script.tsx frontend/src/lib/use-theme.ts frontend/src/app/layout.tsx
git commit -m "feat(theme): FOUC-free pre-paint script + useTheme hook"
```

---

## Task 4: ThemeToggle component + topbar placement

**Files:**
- Create: `frontend/src/components/theme-toggle.tsx`
- Modify: `frontend/src/components/topbar.tsx`

- [ ] **Step 1: Create the toggle**

Create `frontend/src/components/theme-toggle.tsx` — institutional mono "PAPER · INK" segmented switch, sharp, no glow, reduced-motion-safe:

```tsx
'use client';
import { useTheme } from '@/lib/use-theme';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex items-center font-mono text-[10px] tracking-[0.12em] uppercase select-none"
      style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}
    >
      {(['paper', 'ink'] as const).map((t) => {
        const active = theme === t;
        return (
          <button
            key={t}
            type="button"
            aria-pressed={active}
            onClick={() => setTheme(t)}
            className="px-2 py-1 transition-colors"
            style={{
              background: active ? 'var(--accent-subtle)' : 'transparent',
              color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
            }}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Mount the toggle in the topbar (right side, before status)**

In `frontend/src/components/topbar.tsx`, import the toggle and add it as the first item in the right-side `div` (the `flex items-center gap-4` block), before the monitoring status:

```tsx
import ThemeToggle from '@/components/theme-toggle';
// ...inside the right-side div, as the first child:
<ThemeToggle />
<div style={{ width: '1px', height: '16px', background: 'var(--border-default)' }} />
```

- [ ] **Step 3: Verify build + visual toggle**

Run: `cd frontend && npm run build` (expect success). Then `npm run dev`, open the dashboard with the gstack `browse` skill, and confirm: the toggle shows the current theme; clicking PAPER turns the app light, INK turns it dark; reload preserves the choice.
Expected: live switching works, persists across reload, no flash.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/theme-toggle.tsx frontend/src/components/topbar.tsx
git commit -m "feat(theme): ThemeToggle component, mounted in topbar"
```

---

## Task 5: Phase 1 exit verification

**Files:** none.

- [ ] **Step 1: Ink-identical regression check**

With theme = ink, screenshot `/dashboard`, `/trends`, a competitor detail page via `browse`. Compare against the Task 1 baselines. They must match (ink values were moved verbatim).
Expected: ink theme pixel-equivalent to the baseline.

- [ ] **Step 2: OS-default check on a clean profile**

In a fresh browser profile (no `localStorage`), with OS set to light → app loads paper; OS dark → app loads ink. No flash on either.
Expected: OS preference honored with no FOUC.

- [ ] **Step 3: Note known-broken paper screens**

Paper will still show hardcoded dark bits (invisible gray text, dark chart canvases). This is expected — Phase 2 fixes it. List the worst offenders from the screenshots to prioritize.

---

# PHASE 2 — The sweep (per-screen de-hardcoding)

**Method for every file:** replace dark-assuming literals with theme tokens:
- `text-zinc-400`/`text-zinc-500` → `text-[var(--text-secondary)]` (body) or `text-[var(--text-muted)]` (labels/timestamps); `text-zinc-300`/`200` → `text-[var(--text-primary)]`.
- `bg-zinc-*` dark fills → `bg-[var(--surface-raised)]` / `bg-[var(--surface-subtle)]`; light `bg-zinc-100` placeholders → `bg-[var(--surface-subtle)]`.
- `border-zinc-*` → `border-[var(--border-default)]`.
- inline `rgba(255,255,255,0.0X)` → `var(--hairline)` (borders/strokes) or `var(--fill-subtle)` (fills).
- Chart hex → import from `chart-theme.ts` (Task 6).

**Per-file verification:** `npm run build` green, then a grep guard proving the dark literals are gone from that file (shown per task), then a `browse` spot-check of that screen in **both** themes.

---

## Task 6: Theme-aware chart palette

**Files:**
- Create: `frontend/src/lib/chart-theme.ts`

- [ ] **Step 1: Create the chart color resolver**

Recharts needs concrete color strings (it can't read CSS vars for SVG fills reliably across all props). Create a hook that reads the current theme and returns a palette:

```tsx
'use client';
import { useTheme } from '@/lib/use-theme';

export interface ChartPalette {
  accent: string; accentSoft: string;
  positive: string; warning: string; neutral: string; danger: string; violet: string;
  grid: string; axis: string; tick: string;
  surface: string; tooltipBg: string; tooltipBorder: string; cursor: string;
}

const PAPER: ChartPalette = {
  accent: '#345781', accentSoft: '#6a96c8',
  positive: '#1f5d3f', warning: '#8a5a12', neutral: '#5b6470', danger: '#b3261e', violet: '#6d4f9c',
  grid: 'rgba(26,23,20,0.08)', axis: 'rgba(26,23,20,0.18)', tick: '#6b6258',
  surface: '#ffffff', tooltipBg: '#ffffff', tooltipBorder: 'rgba(26,23,20,0.12)', cursor: 'rgba(26,23,20,0.04)',
};
const INK: ChartPalette = {
  accent: '#4f7cb0', accentSoft: '#6a96c8',
  positive: '#5aa07a', warning: '#c79a4e', neutral: '#9aa3af', danger: '#f87171', violet: '#9b7fc7',
  grid: 'rgba(234,230,221,0.08)', axis: 'rgba(234,230,221,0.18)', tick: '#a8a094',
  surface: '#1f1c16', tooltipBg: '#211e17', tooltipBorder: 'rgba(234,230,221,0.14)', cursor: 'rgba(234,230,221,0.04)',
};

export function useChartPalette(): ChartPalette {
  const { theme } = useTheme();
  return theme === 'ink' ? INK : PAPER;
}
```

- [ ] **Step 2: Build check + commit**

Run: `cd frontend && npm run build` (expect success).
```bash
git add frontend/src/lib/chart-theme.ts
git commit -m "feat(theme): theme-aware chart palette resolver"
```

---

## Task 7: Sweep — Dashboard

**Files:**
- Modify: `frontend/src/app/(dashboard)/dashboard/dashboard-client.tsx`
- Modify: `frontend/src/components/stats-card.tsx`
- Modify: `frontend/src/components/mini-activity-chart.tsx`

- [ ] **Step 1: De-hardcode `mini-activity-chart.tsx`**

Make it a palette consumer. Replace the inactive bar fill `rgba(255,255,255,0.08)` and cursor `rgba(255,255,255,0.04)`:
```tsx
'use client';
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useChartPalette } from '@/lib/chart-theme';

export default function MiniActivityChart({ data }: { data: Array<{ value: number; active?: boolean }> }) {
  const p = useChartPalette();
  return (
    <ResponsiveContainer width={120} height={48}>
      <BarChart data={data} barSize={8} barGap={2}>
        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.active ? p.accent : p.grid} />
          ))}
        </Bar>
        <Tooltip
          content={({ active, payload }) => active && payload?.length ? (
            <div className="text-[10px] px-2 py-1 rounded font-mono"
              style={{ background: 'var(--surface-overlay)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
              {payload[0].value} changes
            </div>
          ) : null}
          cursor={{ fill: p.cursor }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Sweep `stats-card.tsx` and `dashboard-client.tsx`**

Apply the replacement method (above) to every `text-zinc-*`, `bg-zinc-*`, `border-zinc-*`, and inline `rgba(255,255,255,…)` in both files. For any chart hex, pull from `useChartPalette()`.

- [ ] **Step 3: Grep guard — no dark literals remain in these files**

Run:
```bash
cd frontend && grep -nE 'rgba\(255,\s*255,\s*255|(text|bg|border)-(zinc|neutral|slate|gray)-(300|400|500|600|700|800|900)' \
  src/components/stats-card.tsx src/components/mini-activity-chart.tsx \
  'src/app/(dashboard)/dashboard/dashboard-client.tsx'
```
Expected: no output (all swept).

- [ ] **Step 4: Build + dual-theme visual check**

Run `npm run build` (expect success). With `browse`, view `/dashboard` in paper and ink: text legible on both, stat tiles and the activity chart correct.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(dashboard)/dashboard/dashboard-client.tsx' src/components/stats-card.tsx src/components/mini-activity-chart.tsx
git commit -m "fix(theme): paper sweep — dashboard + stat tiles + mini chart"
```

---

## Task 8: Sweep — Competitors list + detail + battle card

**Files:**
- Modify: `frontend/src/app/(dashboard)/competitors/competitor-manager.tsx`
- Modify: `frontend/src/app/(dashboard)/competitors/[id]/competitor-detail-client.tsx`
- Modify: `frontend/src/components/battle-card.tsx`
- Modify: `frontend/src/components/hiring-signal-card.tsx`
- Modify: `frontend/src/components/data-sources-panel.tsx`

- [ ] **Step 1: Apply the replacement method to all five files**

Sweep every `text/bg/border-zinc-*`, inline `rgba(255,255,255,…)`, and chart hex (battle-card rating chart + detail charts → `useChartPalette()`).

- [ ] **Step 2: Grep guard**

Run:
```bash
cd frontend && grep -nE 'rgba\(255,\s*255,\s*255|(text|bg|border)-(zinc|neutral|slate|gray)-(300|400|500|600|700|800|900)' \
  'src/app/(dashboard)/competitors/competitor-manager.tsx' \
  'src/app/(dashboard)/competitors/[id]/competitor-detail-client.tsx' \
  src/components/battle-card.tsx src/components/hiring-signal-card.tsx src/components/data-sources-panel.tsx
```
Expected: no output.

- [ ] **Step 3: Build + dual-theme visual check**

`npm run build` (success). `browse` the competitors list and a detail page (with battle card) in both themes.

- [ ] **Step 4: Commit**

```bash
git add 'src/app/(dashboard)/competitors' src/components/battle-card.tsx src/components/hiring-signal-card.tsx src/components/data-sources-panel.tsx
git commit -m "fix(theme): paper sweep — competitors, detail, battle card"
```

---

## Task 9: Sweep — Trends (all charts)

**Files:**
- Modify: `frontend/src/components/trends-chart.tsx`
- Modify: `frontend/src/components/trends-heatmap.tsx`
- Modify: `frontend/src/components/trends-reviews.tsx`
- Modify: `frontend/src/components/trends-type-breakdown.tsx`
- Modify: `frontend/src/components/review-intelligence.tsx`

- [ ] **Step 1: Convert every chart to `useChartPalette()`**

Replace all hardcoded line/bar/area fills, `CartesianGrid` stroke, axis/tick colors, tooltip surfaces, dark canvas fills (`#0e1628`, `#070b14`, `#0a0a0f`), and inline `rgba(255,255,255,…)` with palette fields (`p.accent`, `p.grid`, `p.axis`, `p.tick`, `p.tooltipBg`, `p.tooltipBorder`, `p.surface`, etc.). Heatmap intensity ramps: derive from `p.accent` with varying opacity rather than fixed dark hex.

- [ ] **Step 2: Grep guard — no raw hex or white rgba in chart files**

Run:
```bash
cd frontend && grep -nE '#[0-9a-fA-F]{6}|rgba\(255,\s*255,\s*255' \
  src/components/trends-chart.tsx src/components/trends-heatmap.tsx \
  src/components/trends-reviews.tsx src/components/trends-type-breakdown.tsx \
  src/components/review-intelligence.tsx
```
Expected: no output (all colors come from the palette).

- [ ] **Step 3: Build + dual-theme visual check**

`npm run build` (success). `browse` `/trends` in both themes: lines/bars/grids/axes/tooltips all legible; no dark rectangle behind charts in paper.

- [ ] **Step 4: Commit**

```bash
git add src/components/trends-chart.tsx src/components/trends-heatmap.tsx src/components/trends-reviews.tsx src/components/trends-type-breakdown.tsx src/components/review-intelligence.tsx
git commit -m "fix(theme): paper sweep — trends charts theme-aware"
```

---

## Task 10: Sweep — Queue, Settings, Sidebar, Onboarding, secondary UI

**Files:**
- Modify: `frontend/src/app/(dashboard)/queue/queue-manager.tsx`
- Modify: `frontend/src/app/(dashboard)/settings/settings-client.tsx`
- Modify: `frontend/src/components/sidebar.tsx`
- Modify: `frontend/src/components/onboarding-modal.tsx`
- Modify: `frontend/src/components/ui/how-it-works-panels.tsx`
- Modify: `frontend/src/components/ui/pricing-demo.tsx`

- [ ] **Step 1: Apply the replacement method to all six files**

Sweep grays, inline whites, and any hex. The sidebar uses `rgba(255,255,255,…)` strokes → `var(--hairline)`; keep the active-item accent rule via `var(--accent-primary)`.

- [ ] **Step 2: Grep guard**

Run:
```bash
cd frontend && grep -nE 'rgba\(255,\s*255,\s*255|(text|bg|border)-(zinc|neutral|slate|gray)-(300|400|500|600|700|800|900)|#[0-9a-fA-F]{6}' \
  'src/app/(dashboard)/queue/queue-manager.tsx' 'src/app/(dashboard)/settings/settings-client.tsx' \
  src/components/sidebar.tsx src/components/onboarding-modal.tsx \
  src/components/ui/how-it-works-panels.tsx src/components/ui/pricing-demo.tsx
```
Expected: no output (allow known semantic hex only if intentionally kept — otherwise none).

- [ ] **Step 3: Build + dual-theme visual check**

`npm run build` (success). `browse` `/queue`, `/settings`, the sidebar, and trigger the onboarding modal in both themes.

- [ ] **Step 4: Commit**

```bash
git add 'src/app/(dashboard)/queue' 'src/app/(dashboard)/settings' src/components/sidebar.tsx src/components/onboarding-modal.tsx src/components/ui/how-it-works-panels.tsx src/components/ui/pricing-demo.tsx
git commit -m "fix(theme): paper sweep — queue, settings, sidebar, onboarding, ui"
```

---

## Task 11: Sweep — Auth/login

**Files:**
- Modify: `frontend/src/app/(auth)/auth/login/page.tsx`

- [ ] **Step 1: Sweep login page**

Replace grays, inline whites, and hex. Add `<ThemeToggle />` to the login page corner (it has no topbar) so unauthenticated users can switch.

- [ ] **Step 2: Grep guard**

Run:
```bash
cd frontend && grep -nE 'rgba\(255,\s*255,\s*255|(text|bg|border)-(zinc|neutral|slate|gray)-(300|400|500|600|700|800|900)|#[0-9a-fA-F]{6}' \
  'src/app/(auth)/auth/login/page.tsx'
```
Expected: no output.

- [ ] **Step 3: Build + dual-theme visual check**

`npm run build` (success). `browse` `/auth/login` in both themes.

- [ ] **Step 4: Commit**

```bash
git add 'src/app/(auth)/auth/login/page.tsx'
git commit -m "fix(theme): paper sweep — login + toggle"
```

---

## Task 12: Sweep — Landing page + legal + share (public, highest visibility)

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/privacy/page.tsx`
- Modify: `frontend/src/app/terms/page.tsx`
- Modify: `frontend/src/app/share/[id]/` (the share client/page)

- [ ] **Step 1: Full landing sweep + nav toggle**

`page.tsx` has ~72 dark utilities, inline whites, hex, and a dark hero. Sweep all of them to tokens; convert hero background washes to theme-aware (paper hero on light, current dark hero on ink). Mount `<ThemeToggle />` in the sticky landing nav (the block near `page.tsx:277`). Keep accent washes off large backgrounds per the `687cc9b` lesson.

- [ ] **Step 2: Sweep privacy, terms, and the share page**

Apply the replacement method. The `/share/[id]` public battle card must read correctly in both themes.

- [ ] **Step 3: Grep guard**

Run:
```bash
cd frontend && grep -nE 'rgba\(255,\s*255,\s*255|(text|bg|border)-(zinc|neutral|slate|gray)-(300|400|500|600|700|800|900)' \
  src/app/page.tsx src/app/privacy/page.tsx src/app/terms/page.tsx
```
Expected: no output.

- [ ] **Step 4: Build + dual-theme visual check**

`npm run build` (success). `browse` `/`, `/privacy`, `/terms`, and a `/share/<id>` in both themes. Landing hero legible and on-brand in paper; ink unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/privacy/page.tsx src/app/terms/page.tsx 'src/app/share'
git commit -m "fix(theme): paper sweep — landing, legal, public share"
```

---

# PHASE 3 — QA + ship

## Task 13: Full dual-theme QA pass

**Files:** none (QA), plus any fixes found.

- [ ] **Step 1: Repo-wide residual-literal scan**

Run:
```bash
cd frontend && grep -rnE 'rgba\(255,\s*255,\s*255' src --include=*.tsx | grep -v node_modules
```
Expected: empty (or only intentional, theme-neutral cases — justify each in the commit if any remain).

- [ ] **Step 2: Every screen, both themes, via `browse`**

Walk: landing, login, dashboard, competitors, detail+battle card, trends, queue, settings, onboarding modal, share. In paper AND ink. Check: text contrast (no invisible gray-on-white), charts, borders, badges, focus rings, accent legibility.

- [ ] **Step 3: WCAG contrast spot-check**

Verify slate-blue accent (`#345781`) on paper and muted text (`#9a9186` on `#f5f2ec`) meet AA for their roles. Bump the paper muted token darker if any body text fails.

- [ ] **Step 4: Reduced-motion + responsive**

With `prefers-reduced-motion`, the toggle and transitions collapse to instant. Check mobile widths for the toggle in topbar + landing nav.

- [ ] **Step 5: Fix any findings, then commit**

```bash
git add -A && git commit -m "fix(theme): QA findings across both themes"
```

---

## Task 14: Ship

**Files:** none.

- [ ] **Step 1: Run the backend test suite (sanity — no backend changed)**

Run: `cd /var/www/html/competitor-analyzer && ./venv/bin/python -m unittest discover -s tests -p "test_*.py"`
Expected: all pass (frontend-only change; this just confirms nothing collateral broke).

- [ ] **Step 2: Final production build**

Run: `cd frontend && npm run build`
Expected: clean build.

- [ ] **Step 3: Merge to main and deploy**

```bash
cd /var/www/html/competitor-analyzer
git checkout main && git merge --no-ff redesign/paper-light-theme -m "feat(theme): paper-light theme + toggle (default follows OS)"
git push origin main
```
Vercel auto-deploys the frontend on push. Confirm the deploy is Ready and spot-check production in both themes.

- [ ] **Step 4: Update design docs**

In `DESIGN.md` and `DESIGN-REBUILD-PLAN.md`, mark the paper-light default + toggle as **shipped** (only the bespoke broadsheet relayouts remain). Commit + push.

---

## Self-Review (completed by plan author)

- **Spec coverage:** Architecture (Approach A) → Tasks 2–4. Default-follows-OS + override → Task 2 (CSS fallback) + Task 3 (script/hook). Toggle in topbar + landing nav + login → Tasks 4, 11, 12. Token restructure incl. accent-aware + de-hardcoded fills → Task 2. Pre-paint FOUC → Task 3. Sweep (~180 grays / ~40 whites / ~40 chart hex) → Tasks 6–12 (every enumerated file covered). Charts theme-aware → Tasks 6, 7, 9. Landing full sweep → Task 12. QA (both themes, WCAG, reduced-motion, responsive) → Task 13. Ship + docs → Task 14. No gaps.
- **Placeholder scan:** no TBD/TODO; every code step shows full code; every verify step shows the exact command + expected output.
- **Type consistency:** `Theme` ('paper'|'ink'), `useTheme()` shape, `ChartPalette` fields, and `useChartPalette()` are defined once (Tasks 3, 6) and referenced consistently. Paper = absence of `data-theme`, ink = attribute set — applied uniformly in script, hook, and toggle.
