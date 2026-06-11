# Rivalscope — Design System v3 ("Intelligence Desk")

**Direction:** Institutional authority. A primary-source research terminal you'd trust with revenue decisions.
**Personality:** Calm, serious, precise. Reads like an institutional briefing or a financial ledger, not a colorful SaaS dashboard.
**Memorable thing:** "This is a primary source." Authority through restraint, editorial-grotesk typography, and dense data presented cleanly.

> Supersedes v2 ("Premium Dark Intelligence Platform", sky-blue on blue-black). v3 is a deliberate fresh direction chosen 2026-06-08. **Migration status: DUAL THEME LIVE (paper-light default + ink-dark + toggle shipped 2026-06-08; ink foundation `094d976`, paper sweep + toggle merged `c250746`).** The app renders both themes app-wide; new visitors follow their OS `prefers-color-scheme`, a saved choice overrides + persists. Theme = `data-theme` on `<html>` (`:root` paper / `html[data-theme="ink"]` ink / OS-dark CSS fallback); pre-paint script in `layout.tsx` avoids FOUC; `useTheme()` (`lib/use-theme.ts`) drives the toggle; charts use `useChartPalette()` (`lib/chart-theme.ts`). Remaining: the bespoke broadsheet relayouts (see `DESIGN-REBUILD-PLAN.md`). This doc reflects the **live token names and values in `frontend/src/app/globals.css`** as of 2026-06-11.

The headline departures from v2: a warm **paper-light** default surface (v2 was all-dark), a single **slate-blue** accent (v2 was sky blue; launched as oxblood, swapped in `6fe156a` — see Accent section), a **grotesk + mono** type system with no serif (v2 was Geist), and **sharp 4px** corners with hairline "ledger" rules instead of heavy cards.

---

## Surfaces — dual mode, paper leads

Paper-light is the **default** brand environment; ink-dark is a first-class alternate.

Token names below are the **live** names in `globals.css`. (The original v3 spec used `--paper`/`--panel`/`--ink`/`--rule` names; they shipped as the `--surface-*`/`--text-*`/`--border-*` family.)

### Paper (default / light, `:root`)
| Token | Value | Usage |
|-------|-------|-------|
| `--surface-base` | `#f5f2ec` | Page background (warm off-white briefing paper) |
| `--surface-raised` | `#ffffff` | Cards / panels |
| `--surface-overlay` | `#ffffff` | Modals / popovers |
| `--surface-subtle` | `#fbf9f5` | Hover / inset tints |
| `--text-primary` | `#1a1714` | Primary text, headlines |
| `--text-secondary` | `#6b6258` | Body, descriptions |
| `--text-muted` | `#726b5e` | Labels, datelines, timestamps (darkened from `#9a9186` for WCAG AA ~4.8:1 on `--surface-base`) |
| `--border-default` | `rgba(26,23,20,0.12)` | Section + container rules |
| `--border-subtle` | `rgba(26,23,20,0.07)` | Row dividers |
| `--border-strong` | `rgba(26,23,20,0.22)` | Emphasized rules |
| `--hairline` | `rgba(26,23,20,0.06)` | Finest dividers |
| `--fill-subtle` / `--fill-subtle-hover` | `rgba(26,23,20,0.03)` / `0.05` | Tinted row/hover fills |

### Ink (dark, `html[data-theme="ink"]` + OS-dark fallback)
| Token | Value | Usage |
|-------|-------|-------|
| `--surface-base` | `#16140f` | Page background (warm near-black, not blue-black) |
| `--surface-raised` | `#1f1c16` | Cards / panels |
| `--surface-overlay` | `#211e17` | Modals / popovers |
| `--surface-subtle` | `#26221a` | Hover / inset |
| `--text-primary` | `#eae6dd` | Primary text |
| `--text-secondary` | `#a8a094` | Body |
| `--text-muted` | `#6f685c` | Labels |
| `--border-default` | `rgba(234,230,221,0.14)` | Rules |
| `--border-subtle` | `rgba(234,230,221,0.07)` | Dividers |
| `--border-strong` | `rgba(234,230,221,0.24)` | Emphasized rules |
| `--hairline` | `rgba(234,230,221,0.06)` | Finest dividers |
| `--fill-subtle` / `--fill-subtle-hover` | `rgba(234,230,221,0.04)` / `0.07` | Tinted fills |

Shadows: `--shadow-card`/`--shadow-card-hover` are `none` (flatness is the brand); only `--shadow-elevated` and `--shadow-modal` exist, for overlays.

---

## Accent — Slate-blue (one color, used sparingly)

Slate-blue is the only brand color. It appears on the wordmark mark, the active nav item, the primary button, key tags, and thin section rules. Nowhere else — **never as a background wash or decorative surface**. It is *not* an error color (errors use `--destructive`, a semantic red).

| Token | Paper | Ink |
|-------|-------|-----|
| `--accent-primary` | `#345781` | `#4f7cb0` |
| `--accent-hover` | `#2c4868` | `#6a96c8` |
| `--accent-subtle` | `rgba(52,87,129,0.10)` | `rgba(79,124,176,0.12)` |
| `--accent-border` | `rgba(52,87,129,0.30)` | `rgba(79,124,176,0.34)` |
| `--accent-glow` | `rgba(52,87,129,0.18)` | `rgba(79,124,176,0.25)` |

The Tailwind `sky-*` scale is remapped to this accent in `globals.css`, so `sky-500`/`sky-700` utilities render slate-blue — never introduce raw sky/violet hex.

**History:** v3 launched with an oxblood accent (`#8b2c2c`/`#c0524f`). The sky-remap leaked it into landing-page backgrounds and the whole product read as a "red theme," so it was swapped to slate-blue and pulled out of the glows (`6fe156a`). Lesson kept as a rule: the accent must stay a sparing highlight. Other alternates considered at v3 creation: Brass `#9a6a2f` (drifts luxury-crypto), Ledger green `#1f5d3f` (less ownable).

---

## Change-Type Semantic Colors (re-tuned, low saturation)

Semantic indicators retuned to read as "ledger ink colors," not neon. Each renders as a small mono uppercase tag with a 1px border via the locked `.badge` / `.badge-{type}` classes in `globals.css` (rendered by `components/change-badge.tsx` — always use that component, never restyle inline).

| Change Type | Live value | Tag treatment |
|-------------|-----------|---------------|
| `initial_scan` | accent — paper `#345781`, ink `#4f7cb0` (only badge with a per-theme override) | bg 12–14% / border ~33% |
| `pricing_change` | `#c79a4e` (amber) | bg 12% / border 35% |
| `feature_add` / `new_feature` | `#5aa07a` (green) | bg 12% / border 35% |
| `repositioning` / `positioning_shift` | `#9b7fc7` (violet) | bg 12% / border 30% |
| `review_trend` | `#4f9d9d` (teal) | bg 12% / border 35% |
| `minor_copy` | `#9aa3af` (slate) | bg 10% / border 30% |

> ⚠️ Known gap: apart from `initial_scan`, badge hues are single-value (tuned for ink) with no paper-theme darkening — `#c79a4e` on white is below AA. Candidate fix when touching badges: per-theme values like the settings status-color sweep (`f3493e7`). Chart equivalents live in `lib/chart-theme.ts` and *are* per-theme.

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
| Badges / tags | `2px` | `--radius-sm` |
| Buttons / inputs / cards | `4px` | `--radius-md` |
| Large panels | `6px` | `--radius-lg` |
| Modals / overlays only | `8px` | `--radius-xl` |
| Avatars / pills | `9999px` | `--radius-pill` |

Sharp corners are a core institutional signal. Do not round past 6px on in-page containers (`--radius-xl` is reserved for floating overlays). Never reintroduce v2's `rounded-lg/xl/md` Tailwind classes with default values.

---

## Layout — broadsheet / ledger

- **Sidebar:** `240px` fixed left (`--sidebar-width`), `--surface-base` background, 1px `--border-default` right edge. Mono section dividers ("DESK", "SIGNAL").
- **Content:** max-width `~1180px`, `32px 40px` padding (8pt scale).
- **Rules over cards:** prefer 1px hairline `--border-default` / `--border-subtle` dividers and a single outer container rule over heavy bordered cards everywhere. Broadsheet, not bubble-wrap.
- **Headers:** Archivo display headline + a 2px `--ink` underline rule, with a mono **dateline** beneath (e.g. `MON 08 JUN 2026 · 14 SOURCES · LIVE`).
- **Data:** tables and stat tiles use IBM Plex Mono with `tabular-nums`, right-aligned figures.

---

## Components

### Stat tile (ledger row)
Mono uppercase label, big Plex Mono numeral (`--text-primary`), small mono delta (accent for up). Tiles sit in one bordered container divided by `--border-subtle`, not separate cards.

### Feed row
Grid `1fr auto`. Left: change-type tag, mono URL, body description, a mono `→ OPEN BATTLE CARD` link in `--accent-primary`. Right: mono timestamp. Rows divided by `--border-subtle`.

### Button — primary
`background:--accent-primary; color:#fff`; `font: Archivo 600 12.5px`; `padding:8px 14px`; `radius:4px`; hover `--accent-hover`. No glow. (`text-white` is allowed here — accent surface.)

### Button — ghost
`transparent`, `color:--text-secondary`, `border:1px solid --border-default`, `radius:4px`; hover `--surface-subtle` + `--text-primary`.

### Tag / badge
`font: IBM Plex Mono 600 9.5px`; `letter-spacing:.08em`; uppercase; `padding:2px 7px`; `radius:2px`; 1px colored border; subtle tinted bg. Use `components/change-badge.tsx` + the `.badge-*` classes; never inline.

### Card / panel
`background:--surface-raised`; `border:1px solid --border-default`; `radius:4–6px`; **no drop shadow** (paper uses rules + flatness, not elevation). Hover: border `--accent-border` or `--border-strong`, no lift.

---

## Motion — minimal and crisp

- Duration tokens: `--duration-fast: 100ms`, `--duration-base: 160ms`, `--duration-slow: 240ms`. Nothing slower.
- Easing tokens: `--ease-out` (`cubic-bezier(0,0,0.2,1)`) for enter, `--ease-smooth` (`cubic-bezier(0.16,1,0.3,1)`) for moves; `ease-in` for exit.
- **No spring bounce, no hover lift.** v2's spring nav rail and `y:-2` lifts are dropped. Institutional = still.
- State change = crisp fade/cut. Active nav = instant accent rule.
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
2. **One sparing accent.** Launched as oxblood (serious, editorial, adversarial) but it bled into backgrounds via the sky-remap and read as a "red theme"; now slate-blue (`6fe156a`). The durable decision is the *discipline*: a single accent that appears only on interactive/branded moments, never as a wash.
3. **Grotesk-only (Archivo) + IBM Plex Mono, no serif.** Swiss/precision-instrument authority. Single sans family; weight and scale carry hierarchy.
4. **Sharp 4px corners + hairline ledger rules** instead of heavy shadowed cards. Precise, dense, broadsheet.
5. **Mono datelines + tabular figures everywhere data lives.** Signals a primary source.

---

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-08 | v3 "Intelligence Desk" created via /design-consultation | Fresh institutional-authority direction; grounded in research (Crayon, AlphaSense, Mercury). Supersedes v2 sky/dark. |
| 2026-06-08 | Dual theme shipped (paper default + ink + toggle, OS-aware) | Paper is the brand environment; ink kept first-class for the terminal crowd. `094d976`, `c250746`. |
| 2026-06-08 | Accent swapped oxblood → slate-blue | Sky-remap leaked oxblood into landing backgrounds; product read as a "red theme." Accent must stay a sparing highlight. `6fe156a`. |
| 2026-06-09 | Paper `--text-muted` darkened to `#726b5e` | WCAG AA (~4.8:1) on `#f5f2ec`. |
| 2026-06-11 | DESIGN.md synced to live `globals.css` tokens (this update) | Doc drifted from shipped reality: `--surface-*`/`--text-*`/`--border-*` names, slate-blue accent tables, real badge values (incl. paper-contrast gap flagged), 240px sidebar, live motion/radius tokens. |
