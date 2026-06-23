# Whole-app re-theme to shadcn neutral-modern (Approach A)

**Date:** 2026-06-23
**Status:** design approved; ready for implementation plan (writing-plans)
**Scope:** Frontend visual re-theme of the entire Rivalscope app (Next.js App Router) from the v4 "Signal Desk" system to a clean **shadcn/ui neutral-modern** look, with a single blue accent.

---

## 1. Summary

Re-theme the whole product (marketing landing + auth + all dashboard screens) to the recognizable shadcn/ui neutral-modern aesthetic: zinc neutrals, soft `0.5rem` radius, subtle bordered cards, generous whitespace, one blue accent, light + dark (**dark-first** default). Execution is **Approach A**: stand up shadcn's token layer first (instant whole-app palette/radius shift via token aliasing), then replace hand-rolled components with shadcn primitives and restyle the bespoke pieces screen by screen.

This **supersedes** the v4 "Signal Desk" system (navy `#080b14` + electric-blue, sharp 4px, flat, dark-first, Space Grotesk). DESIGN.md and CLAUDE.md's design section are rewritten at the end.

## 2. Decisions (locked in brainstorming)

| Decision | Choice |
|---|---|
| Look | shadcn neutral-modern (adopt largely as shadcn ships) |
| Accent | single **blue** primary on zinc neutrals |
| Scope | **whole app**, one effort (phased plan) |
| Approach | **A** — token-remap foundation, then component restyle screen-by-screen |
| Font | **Geist Sans + Geist Mono** (replaces Space Grotesk + IBM Plex Mono) |
| Style / base / radius | shadcn **new-york**, **zinc**, **0.5rem** |
| Light/dark | both; **dark-first** default (fresh visitor lands on dark, like v4); saved choice persists |

## 3. Goals / Non-goals

**Goals**
- Every surface reads as a cohesive shadcn neutral-modern product (not a recolored Signal Desk).
- One blue accent used only on primary actions, links, focus/active, selected states.
- Light + dark both correct (WCAG AA), dark-first default.
- No functional regressions: login → add competitor → scan → battle card still works.

**Non-goals**
- No backend/API changes. No new product features or copy rewrites.
- No information-architecture/layout redesign beyond what the neutral-modern feel requires (we restyle, we don't re-plan screens).
- Not coupled to the auth-hardening (PR #21) or Polar work — independent branch.

## 4. Approach A — architecture

The app already drives all color/spacing/radius off CSS-var tokens in `frontend/src/app/globals.css`. Approach A exploits that:

1. **Foundation.** `npx shadcn@latest init` → `components.json`, `cn()` in `src/lib/utils.ts`, add `tailwind-merge`. Verify the shadcn CLI works on **Tailwind v4 + Next 16 + React 19** (canary CLI if needed) BEFORE any screen work — this is the top risk.
2. **Token layer (the bridge).** Define shadcn's standard tokens (oklch) for `:root` (light) + `.dark`. Then **alias the legacy custom tokens to the shadcn tokens** so the entire app shifts palette/radius/borders at once and every existing component keeps rendering during migration. Legacy aliases are retired in cleanup.
3. **Components.** Add shadcn primitives via CLI; replace hand-rolled `ui/*` and inline dialogs/dropdowns/toasts; restyle bespoke pieces (sidebar, topbar, battle-card, intel feed, hero, pricing) into the soft, bordered, whitespace-forward feel.
4. **Per-screen pass.** Migrate screen by screen, each verified by a clean build + screenshot.

### Token mapping (legacy → shadcn)

shadcn tokens defined first (light/dark, oklch): `--background --foreground --card --card-foreground --popover --popover-foreground --primary --primary-foreground --secondary --secondary-foreground --muted --muted-foreground --accent --accent-foreground --destructive --border --input --ring --radius --chart-1..5 --sidebar*`.

Primary blue (tunable in P0): `--primary` ≈ `oklch(0.55 0.21 256)` (blue-600-equivalent), `--primary-foreground` near-white; `--ring` = primary. Base neutrals = zinc.

Legacy alias layer (so existing markup keeps working):
| Legacy token | → shadcn token |
|---|---|
| `--surface-base` | `--background` |
| `--surface-raised` / `--surface-overlay` | `--card` / `--popover` |
| `--surface-subtle` / `--fill-subtle*` | `--muted` |
| `--text-primary` | `--foreground` |
| `--text-secondary` / `--text-muted` | `--muted-foreground` |
| `--border-default` / `--border-subtle` / `--hairline` | `--border` |
| `--border-strong` | `--input` |
| `--accent-primary` / `--accent-cta` / `--accent-hover` | `--primary` (+ hover via opacity) |
| `--accent-text` | `--primary-foreground` |
| `--accent-subtle` | `--accent` (primary tint) |
| `--accent-border` | `--ring` |
| `--radius-md` | `--radius` (0.5rem); `--radius-sm` = `calc(--radius - 2px)`; `--radius-lg` = `calc(--radius + 4px)` |
| `--shadow-card` | none → shadcn cards use `border` + optional `shadow-sm` |
| `--shadow-elevated` / `--shadow-modal` | keep for dialogs/popovers |
| Tailwind `sky-*` remap → accent | re-point to `--primary` (so existing `sky-*` utilities render the new blue) |

The change-type **semantic** colors (`pricing_change`/`feature_add`/etc. badge colors) stay functional but are re-tuned to read on zinc surfaces in both themes; baseline/`initial_scan` uses the new blue.

## 5. Theme switching

Replace the `data-theme="ink|paper"` attribute system with shadcn's **`.dark` class** convention:
- Dark tokens live under `.dark` (not `html[data-theme="ink"]` + OS-media fallback).
- Rewire `lib/use-theme.ts`, the toggle (topbar + landing nav + login), and the pre-paint FOUC script in `layout.tsx` to toggle `.dark`.
- Default = **dark** (the pre-paint script applies `.dark` for a fresh visitor); a saved choice persists and overrides. Keeps the v4 dark-first behavior, re-expressed via the `.dark` class instead of `data-theme="ink"`.
- `useChartPalette()` (`lib/chart-theme.ts`) re-points to the new `--chart-*` tokens.

## 6. Typography

- Add Geist (`geist` package or `next/font`): **Geist Sans** (UI/display), **Geist Mono** (numerals/code/timestamps).
- Replace Space Grotesk / IBM Plex Mono; retire the legacy `--font-archivo` alias.
- Drop the big editorial display tracking (the appkittie-grade negative tracking) in favor of Geist's tighter modern defaults; large headings stay large but lose the broadsheet character.

## 7. Components

Pull via CLI (new-york): `button input label textarea card dialog alert-dialog dropdown-menu select tabs badge switch checkbox sonner tooltip separator skeleton table sheet avatar popover scroll-area`.

Replace:
- Hand-rolled `components/ui/button.tsx | label.tsx | switch.tsx` → shadcn.
- Inline/scattered dialogs, dropdowns, toasts across dashboard clients → shadcn `dialog` / `dropdown-menu` / `sonner`.
- Mobile nav (hamburger) → shadcn `sheet`.

Restyle bespoke (keep structure, change skin):
- `sidebar`, `topbar`, `main-content`, `battle-card(-content)`, intel feed, `hero-rotating-word`, `pricing(-demo)`, `how-it-works-panels`, `product-demo`.
- Direction: soft bordered cards (`border` + `shadow-sm`), zinc neutrals, more whitespace, `0.5rem` radius, no mono-uppercase eyebrow density, no hairline-on-navy editorial look.

## 8. Per-screen migration + order

`frontend/src/app/...`:
1. **Foundation**: globals.css tokens + aliases, Geist, `.dark` toggle, `lib/utils.cn`, core primitives.
2. **Landing** (`page.tsx` + section components).
3. **Auth** (`(auth)/auth/login`, `auth/verify`).
4. **Dashboard shell** (`(dashboard)/layout.tsx`, sidebar, topbar, main-content).
5. **Dashboard screens**: dashboard, competitors (+`[id]`), battlecards, queue, trends, campaigns (+`[id]` war room), discover, settings, billing/checkout (+success).
Each screen: swap primitives → adjust layout to neutral-modern → `npm run build` clean → screenshot check (light + dark).

## 9. Phasing (for the implementation plan)

- **P0 — Foundation**: shadcn init + toolchain proof, token layer + aliases, Geist, `.dark` theme switch, core primitives. (Whole app visually shifts here.)
- **P1 — Landing** (marketing surface).
- **P2 — Auth + dashboard shell**.
- **P3 — Dashboard screens** (the bulk; can sub-batch).
- **P4 — Cleanup**: retire legacy token aliases, delete dead Signal Desk CSS, rewrite `DESIGN.md` + CLAUDE.md design section to the shadcn system.

## 10. Risks & mitigations

- **Toolchain (top risk):** shadcn CLI + Tailwind v4 + Next 16 + React 19 compatibility. Mitigation: prove it in P0 with one primitive before committing; use canary if needed; manual component add as fallback.
- **Intermediate "half-shadcn" phase:** after token-remap, un-migrated screens look recolored-but-not-restyled. Acceptable mid-flight; resolved as screens are migrated. Don't ship to prod mid-flight.
- **Functional regression:** re-theme touches many client components (some carry handlers). Mitigation: per-screen build + the existing 527-test backend suite is unaffected; **re-run the browser e2e** (login → add competitor → scan → battle card) at the end.
- **Live product:** sweeping visual change. Mitigation: do it on a branch `feat/shadcn-retheme`; verify on a **Vercel preview**; deliberate deploy, not a casual push to main.
- **Accessibility:** new blue + zinc must hit WCAG AA in both themes (body 4.5:1, UI 3:1). Verify during P0 token tuning.

## 11. Verification / testing

- Per screen: `npm run build` (TS + lint clean) + light/dark screenshots.
- End: browser e2e of the core funnel; full `npm run build`; a `/design-review`-style pass against the new shadcn look.
- DESIGN.md + CLAUDE.md updated to reflect the shadcn system as the new source of truth.

## 12. Open / tunable

- Exact `--primary` blue oklch (tune in P0 for AA + taste).
- Whether to keep any Signal Desk character (e.g., mono for numerals via Geist Mono — yes) vs full shadcn defaults.
- Sidebar uses shadcn's `sidebar` block vs restyling the existing one (decide in P2; lean restyle-existing to preserve behavior).
