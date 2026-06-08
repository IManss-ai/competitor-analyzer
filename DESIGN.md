# Rivalscope — Design System v3 ("Intelligence Desk")

**Direction:** Institutional authority. A primary-source research terminal you'd trust with revenue decisions.
**Personality:** Calm, serious, precise. Reads like an institutional briefing or a financial ledger, not a colorful SaaS dashboard.
**Memorable thing:** "This is a primary source." Authority through restraint, editorial-grotesk typography, and dense data presented cleanly.

> Supersedes v2 ("Premium Dark Intelligence Platform", sky-blue on blue-black). v3 is a deliberate fresh direction chosen 2026-06-08. **Migration status: DUAL THEME LIVE (paper-light default + ink-dark + toggle shipped 2026-06-08; ink foundation `094d976`, paper sweep + toggle merged `c250746`).** The app renders both themes app-wide; new visitors follow their OS `prefers-color-scheme`, a saved choice overrides + persists. Theme = `data-theme` on `<html>` (`:root` paper / `html[data-theme="ink"]` ink / OS-dark CSS fallback); pre-paint script in `layout.tsx` avoids FOUC; `useTheme()` drives the toggle; charts use `useChartPalette()`. Remaining: the bespoke broadsheet relayouts (see `DESIGN-REBUILD-PLAN.md`). The live accent is **slate-blue** (paper `#345781`, ink `#4f7cb0`); the oxblood values named below are historical (oxblood read as a "red theme" once the sky-remap leaked it into landing backgrounds, so it was swapped + pulled out of the glows, `6fe156a`). Lesson: the accent must stay a sparing highlight, never a background wash. (Paper `--muted` was darkened to `#726b5e` for WCAG AA on `#f5f2ec`.)

The headline departures from v2: a warm **paper-light** default surface (v2 was all-dark), an **oxblood** accent (v2 was sky blue), a **grotesk + mono** type system with no serif (v2 was Geist), and **sharp 4px** corners with hairline "ledger" rules instead of heavy cards.

---

## Surfaces — dual mode, paper leads

Paper-light is the **default** brand environment; ink-dark is a first-class alternate.

### Paper (default / light)
| Token | Value | Usage |
|-------|-------|-------|
| `--paper` | `#f5f2ec` | Page background (warm off-white briefing paper) |
| `--panel` | `#ffffff` | Cards / panels |
| `--raised` | `#fbf9f5` | Hover / inset tints |
| `--ink` | `#1a1714` | Primary text, headlines |
| `--secondary` | `#6b6258` | Body, descriptions |
| `--muted` | `#9a9186` | Labels, datelines, timestamps |
| `--rule` | `rgba(26,23,20,0.12)` | Section + container rules |
| `--rule-soft` | `rgba(26,23,20,0.07)` | Row dividers |

### Ink (dark)
| Token | Value | Usage |
|-------|-------|-------|
| `--paper` | `#16140f` | Page background (warm near-black, not blue-black) |
| `--panel` | `#1f1c16` | Cards / panels |
| `--raised` | `#211e17` | Hover / inset |
| `--ink` | `#eae6dd` | Primary text |
| `--secondary` | `#a8a094` | Body |
| `--muted` | `#6f685c` | Labels |
| `--rule` | `rgba(234,230,221,0.14)` | Rules |
| `--rule-soft` | `rgba(234,230,221,0.07)` | Dividers |

---

## Accent — Oxblood (one color, used sparingly)

Oxblood is the only brand color. It appears on the wordmark mark, the active nav item, the primary button, key tags, and thin section rules. Nowhere else. It is **not** an error color (errors get their own semantic red).

| Token | Paper | Ink |
|-------|-------|-----|
| `--oxblood` | `#8b2c2c` | `#c0524f` |
| `--oxblood-hover` | `#722525` | `#cf6360` |
| `--oxblood-subtle` | `rgba(139,44,44,0.08)` | `rgba(192,82,79,0.12)` |
| `--oxblood-rule` | `rgba(139,44,44,0.30)` | `rgba(192,82,79,0.34)` |

Alternates considered and rejected for now: Brass `#9a6a2f` (premium but drifts luxury-crypto), Ledger green `#1f5d3f` (less ownable).

---

## Change-Type Semantic Colors (re-tuned, low saturation)

Kept as semantic indicators, retuned to read as "ledger ink colors," not neon. Each renders as a small mono uppercase tag with a 1px border.

| Change Type | Paper | Ink | Tag |
|-------------|-------|-----|-----|
| `pricing_change` | `#8a5a12` (amber) | `#c79a4e` | bg 10% / border 35% |
| `feature_add` | `#1f5d3f` (green) | `#5aa07a` | bg 10% / border 35% |
| `repositioning` | `--oxblood` | `--oxblood` | uses oxblood-subtle |
| `review_trend` | `#2c5a8b` (slate-blue) | `#6f9bce` | bg 10% / border 35% |
| `minor_copy` | `#5b6470` (slate) | `#9aa3af` | bg 10% / border 30% |

---

## Typography — grotesk + mono, no serif

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Display / Headlines | **Archivo** | 800 / 900 | Page titles, big statements. Institutional grotesk masthead. |
| UI / Body | **Archivo** | 400 / 500 / 600 | Nav, labels, descriptions. One family, weight does the contrast. |
| Data / Mono | **IBM Plex Mono** | 400 / 500 / 600 | URLs, metric numerals, diffs, timestamps, datelines, tags. `tabular-nums` always. |

- Load via `next/font/google` (`Archivo`, `IBM_Plex_Mono`) as CSS variables.
- No serif. The authority comes from weight, scale, tight tracking, and mono precision.
- Self-host alternate (optional): **Mona Sans** can replace Archivo for display+UI if a more neutral grotesk is wanted; not on Google Fonts, so it needs fontsource/self-host.
- Display tracking: `-0.02em`. Mono uppercase labels: `+0.12em`.

---

## Radius — sharp

| Context | Value | Token |
|---------|-------|-------|
| Badges / tags | `2px` | `--r-sm` |
| Buttons / inputs / cards | `4px` | `--r` |
| Large panels | `6px` | `--r-lg` |
| Avatars / pills | `9999px` | `--r-pill` |

Sharp corners are a core institutional signal. Do not round past 6px on containers.

---

## Layout — broadsheet / ledger

- **Sidebar:** `236px` fixed left, `--paper` background, 1px `--rule` right edge. Mono section dividers ("DESK", "SIGNAL").
- **Content:** max-width `~1180px`, `30px 40px` padding.
- **Rules over cards:** prefer 1px hairline `--rule` / `--rule-soft` dividers and a single outer container rule over heavy bordered cards everywhere. Broadsheet, not bubble-wrap.
- **Headers:** Archivo display headline + a 2px `--ink` underline rule, with a mono **dateline** beneath (e.g. `MON 08 JUN 2026 · 14 SOURCES · LIVE`).
- **Data:** tables and stat tiles use IBM Plex Mono with `tabular-nums`, right-aligned figures.

---

## Components

### Stat tile (ledger row)
Mono uppercase label, big Plex Mono numeral (`--ink`), small mono delta (oxblood for up). Tiles sit in one bordered container divided by `--rule-soft`, not separate cards.

### Feed row
Grid `1fr auto`. Left: change-type tag, mono URL, body description, a mono `→ OPEN BATTLE CARD` link in oxblood. Right: mono timestamp. Rows divided by `--rule-soft`.

### Button — primary (`.rs-btn-primary`)
`background:--oxblood; color:#fff` (ink mode: dark ink text); `font: Archivo 600 12.5px`; `padding:8px 14px`; `radius:4px`; hover `--oxblood-hover`. No glow.

### Button — ghost (`.rs-btn-ghost`)
`transparent`, `color:--secondary`, `border:1px solid --rule`, `radius:4px`; hover `--raised` + `--ink`.

### Tag / badge
`font: IBM Plex Mono 600 9.5px`; `letter-spacing:.08em`; uppercase; `padding:2px 7px`; `radius:2px`; 1px colored border; subtle tinted bg.

### Card / panel (`.rs-card`)
`background:--panel`; `border:1px solid --rule`; `radius:4–6px`; **no drop shadow** (paper uses rules + flatness, not elevation). Hover: border `--oxblood-rule` or `--ink`-tinted, no lift.

---

## Motion — minimal and crisp

- Durations: micro `80–120ms`, short `150–200ms`. Nothing slow.
- Easing: `ease-out` for enter, `ease-in` for exit.
- **No spring bounce, no hover lift.** v2's spring nav rail and `y:-2` lifts are dropped. Institutional = still.
- State change = crisp fade/cut. Active nav = instant oxblood rule.
- `prefers-reduced-motion`: all transitions collapse to instant.

---

## Spacing (8pt scale, unchanged)
```
4px  8px  12px  16px  24px  32px  40px  48px  64px
```
Gaps, padding, margins MUST use this scale. No arbitrary values.

---

## Creative Decisions (v3)

1. **Paper-light briefing primary + ink terminal alt.** The biggest swing. Reads as a printed institutional report. Differentiates hard from Crayon (loud) and from v2 (dark neon).
2. **Oxblood accent, not blue.** Serious, editorial, quietly adversarial — you track rivals to beat them. Nobody in the category uses it.
3. **Grotesk-only (Archivo) + IBM Plex Mono, no serif.** Swiss/precision-instrument authority. Single sans family; weight and scale carry hierarchy.
4. **Sharp 4px corners + hairline ledger rules** instead of heavy shadowed cards. Precise, dense, broadsheet.
5. **Mono datelines + tabular figures everywhere data lives.** Signals a primary source.

---

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-08 | v3 "Intelligence Desk" created via /design-consultation | Fresh institutional-authority direction; grounded in research (Crayon, AlphaSense, Mercury). Supersedes v2 sky/dark. Rebuild planned, not yet implemented. |
