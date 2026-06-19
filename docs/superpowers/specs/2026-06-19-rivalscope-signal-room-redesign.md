# Rivalscope Redesign — "Signal Room" (Direction A) — Spec + Autonomous Charter

**Date:** 2026-06-19 · **Branch:** `redesign-signal-room` · **Mode:** autonomous (user asleep, `/goal` set)

## Why
Beta feedback (7 users): the app felt "AI-slop", empty, austere, slow, hard to navigate. User wants a premium, distinctive UI in the spirit of Linear/Mercury/Vercel craft + AppKittie's lime accent + "confident energy". Validated via visual companion: chose the **blended "Signal Room" concept**.

## The Concept (organizing idea, not a palette)
A **live intelligence command surface**. The screen opens with **The Brief** (the single most important real competitor move), then drops into the **Signal Board** (competitors ranked by signal). Near-monochrome, Linear-grade restraint.

**The one discipline that kills slop: lime = MEANING, never decoration.** Lime (`#c8ff00`) appears only on: primary actions, live/active state, and the single genuinely-hot signal. Everything else is monochrome. No glow washes.

## Design system (implemented in `globals.css`, ink theme = default)
- Surfaces: cool near-black `--surface-base #0a0b0d`, raised `#101216`, overlay `#15171c`.
- Text: `#e8eaed` / `#9a9ea6` / `#646871`. Borders: white at 5–20% alpha.
- Accent (lime): `--accent-primary #c8ff00`, `--accent-hover #d7ff3f`, `--accent-text #0d1500` (DARK text on lime — never `#fff`/`text-white` on accent).
- Tailwind `sky-*` remapped to lime in ink (the app's pervasive accent).
- Charts: `chart-theme.ts` ink palette → lime.
- Type: Space Grotesk (display 500/600) + IBM Plex Mono (data). Sharp radii. Flat (no card shadows). 8pt spacing.
- Dual-theme infra kept intact (paper = light alternate, still slate-blue — lime is unreadable on cream). Default is ink/Signal Room (pre-paint script already defaults to ink).
- New: `.sr-pulse` lime live dot.

## Data honesty (critical)
Real `/api/v1/dashboard` is thin (often 1 competitor, `initial_scan` baseline, no reviews). The dashboard derives an **honest signal score** from real fields (`change_type` weight × recency × `net_char_delta`) — never invented numbers. Empty/sparse states are first-class ("You're now tracking X", "All quiet"). Auth: API client sends `Authorization: Bearer <userId>`.

## Done-line (the bar; stop here)
1. ✅ Design system in code (ink → Signal Room, lime-as-signal, contrast fixed)
2. ✅ Dashboard rebuilt on real data (Brief + Signal Board, honest empty states)
3. ⬜ Every other screen coherent + not-broken (token retune + spot fixes; fix white-on-lime in landing/pricing)
4. ⬜ `next build` passes; QA each screen (render, console, mobile); fix breakage
5. ⬜ Self-review vs AI-slop checklist (own eyes vs Linear + subagent)
6. ⬜ Push branch → Vercel **preview** deploy (NOT prod — launch window, unseen design); tag main for rollback
7. ⬜ Wake-up report: preview URL, one-command promote, one-command revert, honest scope

## Deploy decision
Preview deploy, not prod-promote. Rationale: PH launch window + 7 live users + user hasn't seen it rendered. "Pushed & deployed" satisfied by a live, viewable preview one command from production. Tag `pre-signal-room` on `973739c` for instant rollback.

## Slop checklist (self-review against)
lime-as-decoration · glow washes · centered generic grids · hollow/empty feel · weak hierarchy · text bloat · white-on-lime contrast · uniform bubbly radius.
