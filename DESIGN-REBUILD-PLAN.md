# Design Rebuild Plan — v2 → v3 "Intelligence Desk"

Target spec: `DESIGN.md` (v3). This plan takes the live app from v2 (sky-blue, all-dark, Geist, rounded) to v3 (paper+ink, oxblood, Archivo + IBM Plex Mono, sharp). Preview: `~/.gstack/projects/IManss-ai-competitor-analyzer/designs/intelligence-desk-20260608/preview.html`.

**Scale: large.** This is a full visual rebuild, not a recolor. Do it on a dedicated branch, foundation-first, screen-by-screen, public pages last. Gate the merge behind `/qa` + `/design-review`.

**Biggest risk:** the app has **no light mode today**. It is built all-dark, and components hardcode dark values inline (e.g. `rgba(255,255,255,0.06)` strokes, fixed hex in Recharts, inline `style={{...}}`). Paper-light as the *default* means every hardcoded dark assumption has to become a theme-aware token. Budget most of the effort here, not in the token file.

---

## Phase 1 — Foundation (tokens, fonts, theming infra)
- `frontend/src/app/globals.css`: replace the `:root` block with v3 **paper** tokens; add an `html[data-theme="ink"]` block with the **ink** tokens (values in `DESIGN.md`). Update `--radius-*` to `2 / 4 / 6 / 9999`. Set card shadow to `none` for paper. Add `--oxblood*` and the retuned change-type vars.
- Fonts: swap `next/font` from Geist to **Archivo** (display + UI) and **IBM Plex Mono** (data) in `app/layout.tsx`; rewire `--font-sans` / `--font-mono`.
- Theming: add `data-theme` on `<html>` (default `"paper"`), a small theme toggle component, and SSR-safe persistence (cookie or inline script to avoid flash). The app currently assumes one theme; this is new infrastructure.
- Exit check: a throwaway page renders both themes with correct tokens + fonts.

## Phase 2 — Core component layer
- `globals.css` component classes: `.rs-card` (no shadow, 4–6px, rule border, no hover lift), `.rs-btn-primary` / `.rs-btn-ghost` (oxblood, sharp, no glow), `.rs-input` (oxblood focus, no glow ring), `.badge`/tag (Plex Mono, 2px, tinted), `.rs-label`.
- Change-type colors: retune the 5 semantic tags (amber / green / oxblood / slate-blue / slate) per `DESIGN.md`, both themes.
- Motion: remove v2's spring physics and `whileHover={{ y: -2 }}` lifts (grep `framer-motion` / `motion/react`, `stiffness`, `whileHover`). Replace with crisp `ease-out` fades, 80–200ms. Keep `prefers-reduced-motion` collapse.

## Phase 3 — Layout chrome
- `components/sidebar.tsx`: paper bg, mono section dividers ("DESK"/"SIGNAL"), oxblood square wordmark mark, active = oxblood left rule (sharp, no spring), Plex Mono counts.
- `components/topbar.tsx`: Archivo display title + 2px `--ink` underline + Plex Mono dateline row.
- Dashboard shell padding / max-width per `DESIGN.md`.

## Phase 4 — Screen cutover (the long tail, one screen at a time)
Order by traffic + risk:
1. **Dashboard** (`dashboard-client.tsx`) — stat tiles → ledger row, intel feed → ledger rows, tracked-competitors panel. Includes the dashboard activity chart (still has the `-1` Recharts warning; fix the mount-gate while restyling).
2. **Competitors + detail** (`competitor-detail-client.tsx`) — the battle card 4-quadrant in v3; the rating chart.
3. **Trends** (`trends-*.tsx`) — restyle all Recharts to paper/ink: line/bar fills to oxblood/amber/green/slate-blue, mono ticks, hairline grid. Inline-hardcoded chart styles must become theme-aware.
4. **Intel feed, Action queue, Settings.**
5. **Auth / login** and the **public landing/marketing** page — biggest visual flip (current hero is dark); do last, highest visibility.
6. **/share** page (public battle card).

## Phase 5 — QA + polish
- Both themes on every screen; WCAG contrast (oxblood-on-paper, muted text); `prefers-reduced-motion`; responsive.
- Regenerate dark-themed **OG/share images** (they assume the v2 look).
- Run `/qa` and `/design-review`; fix findings; then merge.

---

## Execution notes
- **Branch:** `redesign/intelligence-desk`. Keep `main` shipping v2 until the rebuild is QA-clean, to avoid a half-migrated production app.
- **Coexistence:** Phase 1 theme infra lets v2 and v3 coexist per-screen during cutover, but per `CLAUDE.md`, never mix v2 and v3 in one view.
- **Don't** start Phase 4 before Phases 1–3 are solid; screen work on shaky tokens means rework.
- This is the kind of multi-phase build that suits an execute-phase / subagent workflow once the branch and Phase 1 land.
