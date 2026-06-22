# Rivalscope — Design System v4 ("Signal Desk", blue · dark-first)

**Direction:** A confident competitive-intelligence terminal. Deep navy near-black canvas, one electric-blue signal accent, big editorial grotesk type. The structural confidence and motion of appkittie / Linear, governed by strict accent discipline.
**Personality:** Sharp, fast, trustworthy. Reads like a professional intel/trading terminal, not a pastel SaaS.
**Memorable thing:** Electric blue on deep navy — one accent, used only where there's meaning (signal + primary action), with a single gradient "glow" moment per view.

> **Supersedes** v3 "Intelligence Desk" (paper-light default + slate-blue) and the reverted lime "Signal Room" experiment. This is the **blue, dark-first** system on branch `feat/blue-redesign`. **Dark (ink) is the default and the primary design target**; paper-light remains a working alternate through the same token names. Reference anchors: **appkittie.com** (huge display type, dense confident layout, one signature gradient) and **Linear** (accent scarcity, surface-ladder depth, product screenshots as the protagonist) — adapted, never copied. Token names below are the live names in `frontend/src/app/globals.css`; this doc is the spec the CSS implements.

---

## Themes — dark leads

Dark (ink) is the brand environment and the default a fresh visitor lands on. Paper-light is a first-class alternate via the theme toggle. Both use the same `--surface-*` / `--text-*` / `--border-*` token family.

### Ink (dark, default — `html[data-theme="ink"]` + OS-dark fallback)
| Token | Value | Usage |
|-------|-------|-------|
| `--surface-base` | `#080b14` | Page background (deep navy near-black, faint blue tint) |
| `--surface-raised` | `#0e1320` | Cards / panels (one step up) |
| `--surface-overlay` | `#121829` | Modals / popovers / two-step lift |
| `--surface-subtle` | `#161d2e` | Hover / inset tints |
| `--text-primary` | `#e9edf6` | Headlines, primary text (cool off-white, never pure `#fff`) |
| `--text-secondary` | `#9aa6bd` | Body, descriptions |
| `--text-muted` | `#828ea6` | Labels, datelines, timestamps (AA-tuned for raised surfaces too, ≥4.5:1) |
| `--border-default` | `rgba(180,200,235,0.12)` | Container + section rules |
| `--border-subtle` | `rgba(180,200,235,0.06)` | Row dividers |
| `--border-strong` | `rgba(180,200,235,0.22)` | Emphasized rules / hover |
| `--hairline` | `rgba(180,200,235,0.05)` | Finest dividers |
| `--fill-subtle` / `-hover` | `rgba(180,200,235,0.035)` / `0.06` | Row / hover fills |

Depth is carried by the **surface ladder + hairline borders**, not shadows (Linear move). `--shadow-card` stays `none`; only `--shadow-elevated` / `--shadow-modal` exist, for floating overlays.

### Paper (light alternate — `:root`)
Retained from v3, already in the blue family (slate-blue accent). `--surface-base` `#f5f2ec`, `--text-primary` `#1a1714`, etc. Not the primary design target; kept working and AA-correct.

---

## Accent — electric blue (one color, used sparingly)

Blue is the only brand color. It appears on the brand mark, the primary action, the active nav item, signal indicators (live dot, signal score), links, focus rings, and thin accent rules. **Never as a background wash on content surfaces, never on decorative cards.** It is not an error color (errors use `--destructive`).

| Token | Ink (dark) | Paper (light) | Notes |
|-------|-----------|---------------|-------|
| `--accent-primary` | `#2e8bff` | `#345781` | Electric azure. Links, icons, headline accent word, signal, focus, borders. Azure-on-navy = AA. |
| `--accent-cta` | `#1e6bff` | `#345781` | **Primary button background** — deeper so white label hits WCAG AA (white/`#1e6bff` ≈ 4.55:1). |
| `--accent-hover` | `#54a3ff` | `#2c4868` | Hover state |
| `--accent-text` | `#ffffff` | `#ffffff` | Text on accent fills (verified AA on `--accent-cta`) |
| `--accent-subtle` | `rgba(46,139,255,0.12)` | `rgba(52,87,129,0.10)` | Tinted accent fills |
| `--accent-border` | `rgba(46,139,255,0.30)` | `rgba(52,87,129,0.30)` | Accent rules / selected borders |
| `--accent-glow` | `rgba(46,139,255,0.28)` | `rgba(52,87,129,0.18)` | The signature gradient glow (see below) |
| `--accent-deep` | `#0a2550` | `#243a54` | Navy anchor for the gradient + brand mark |

The Tailwind `sky-*` scale is remapped to this accent in `globals.css`, so legacy `sky-*` utilities render electric blue. Never introduce raw blue/violet hex outside these tokens.

**Discipline rule (kept from v3, the durable lesson):** the accent is a sparing highlight. Two shades only — `--accent-primary` (vibrant, for accent text/marks on dark) and `--accent-cta` (deeper, for white-text buttons). No purple/indigo drift — the hue stays a true cool blue (~213–220°).

---

## Signature gradient — one moment per view

The one place the blue becomes a gradient: a **navy → electric-azure radial glow** behind the hero headline (and a 135° navy→azure on the brand mark). It is the appkittie "spotlight" move, in our blue.

- Hero glow: `radial-gradient(ellipse at center, rgba(46,139,255,0.28), transparent 62%)` behind the headline, `z-index` below text.
- A 1px top-edge accent line on the framed product screenshot: `linear-gradient(90deg, transparent, rgba(46,139,255,0.8), transparent)`.
- **Hard limit: one gradient moment per viewport.** Never smear it across sections, cards, buttons, or full-bleed backgrounds. Everywhere else the blue is a flat solid.

---

## Change-Type Semantic Colors (re-tuned for navy)

Semantic indicators are distinct from the brand blue. Each renders as a small mono uppercase tag via `.badge-{type}` (component `change-badge.tsx`). On the navy ink surface they use the brighter hues; paper keeps darkened hues. `initial_scan` / baseline uses the brand blue.

| Change Type | Ink (on navy) | Paper |
|-------------|---------------|-------|
| `pricing_change` | `#c79a4e` (amber) | `#8a5a12` |
| `feature_add` / `new_feature` | `#5aa07a` (green) | `#1f5d3f` |
| `repositioning` | `#9b7fc7` (violet) | `#6d4f9c` |
| `review_trend` | `#4f9d9d` (teal) | `#2c6f6f` |
| `minor_copy` | `#9aa3af` (slate) | `#5b6470` |
| `initial_scan` / baseline | `#2e8bff` (brand blue) | `#345781` |

> Violet stays a *semantic* tag color only (repositioning), never a brand/UI accent — the brand hue is blue. Keeps us clear of the purple-AI-slop trap.

---

## Typography — Space Grotesk + IBM Plex Mono, no serif

Unchanged family system; **adds a big display scale** for the marketing surface (appkittie/Linear move).

| Role | Font | Size / Weight / Tracking | Usage |
|------|------|--------------------------|-------|
| Display XL (hero) | Space Grotesk | 80–92px / 500 / `-0.045em` | Landing hero headline |
| Display LG | Space Grotesk | 48–56px / 500 / `-0.03em` | Section openers |
| Display MD | Space Grotesk | 32–40px / 500 / `-0.02em` | Sub-sections |
| Heading | Space Grotesk | 21–28px / 600–700 / `-0.015em` | In-app page titles, card titles |
| UI / Body | Space Grotesk | 15–18px / 400–600 | Nav, labels, paragraphs |
| Data / Mono | IBM Plex Mono | 11–14px / 400–600, `tabular-nums` | URLs, numerals, timestamps, tags, datelines, eyebrows |

- Loaded via `next/font/google`; Space Grotesk is fed through the legacy `--font-archivo` variable (one-swap alias). No serif.
- Display tracking pulls aggressively negative on the big sizes (appkittie H1 is `-4.8px` at 96px). Mono uppercase labels/eyebrows: `+0.12–0.14em`.
- Body never below 16px on marketing; cool off-white `--text-primary`, never pure white.

---

## Radius — sharp (unchanged)

| Context | Value | Token |
|---------|-------|-------|
| Badges / tags | 2px | `--radius-sm` |
| Buttons / inputs / cards | 4px | `--radius-md` |
| Large panels | 6px | `--radius-lg` |
| Modals / framed screenshots | 8px | `--radius-xl` |
| Pills / avatars | 9999px | `--radius-pill` |

Sharp corners are a brand signal. We keep our 4px house style rather than appkittie's soft 10–24px radii. No `rounded-lg/xl` Tailwind defaults.

---

## Spacing (8pt scale, unchanged)
```
4  8  12  16  24  32  40  48  64  ·  96 (section rhythm on marketing)
```
All gaps/padding/margins use this scale. No arbitrary values.

---

## Motion — alive, not bouncy

- Durations: `--duration-fast 100ms`, `--duration-base 160ms`, `--duration-slow 240ms`; marketing reveals may run to ~400ms.
- Easing: `--ease-out` (`cubic-bezier(0,0,0.2,1)`) enter, `--ease-smooth` (`cubic-bezier(0.16,1,0.3,1)`) moves; `ease-in` exit.
- Purposeful only: fades, count-ups, staggered reveals, hover states that *explain* (reveal a label/diff). **No spring bounce, no `y:-` hover lift, no `transition: all`.** Animate `transform`/`opacity` only.
- `prefers-reduced-motion: reduce` collapses everything to instant AND forces scroll-reveal content visible (the `[style*="opacity:0"]` override stays — it's why reduced-motion users don't see blank sections).

---

## Components (on navy)

- **Button — primary:** `background: var(--accent-cta)`, `color: var(--accent-text)` (white, AA-verified), Space Grotesk 600, 9px 16px, radius 4px, hover `--accent-hover`. No glow.
- **Button — ghost:** transparent, `--text-secondary`, 1px `--border-default`, hover `--fill-subtle-hover` + `--text-primary`.
- **Card / panel:** `--surface-raised`, 1px `--border-default`, radius 4–6px, **no shadow**; hover = border `--accent-border` or `--border-strong`, no lift.
- **Tag / badge:** IBM Plex Mono 600 ~10px, uppercase, 2px radius, 1px colored border, subtle tinted bg. Use `change-badge.tsx`.
- **Eyebrow:** mono, uppercase, `+0.14em`, `--accent-primary`, optional 1px accent border + live dot.
- **Stat tile / feed row:** mono `tabular-nums`, hairline-divided in one bordered container, not separate cards.

---

## Responsive Behavior

| Breakpoint | Min width | Tailwind | Notes |
|------------|-----------|----------|-------|
| Mobile     | base      | (none)   | Single column; hero display drops to 40–52px |
| Tablet     | 640px     | `sm:`    | Two-up grids begin |
| Desktop    | 768px     | `md:`    | Primary layout target (most-used breakpoint) |
| Wide       | 1024px    | `lg:`    | Max content width ~1280px, centered |

- **Touch targets ≥ 44px** on touch-reachable controls — mobile menu, theme toggle, CTAs, brand logo, footer links. **≥24px acceptable for pointer-only desktop nav** (WCAG AA 2.5.8) so the top bar stays slim (matches Linear/Stripe). Never rely on hover alone for clickability.
- No horizontal scroll at any width; never `user-scalable=no` / `maximum-scale=1`.
- `xl:` / `2xl:` intentionally unused — layouts top out at `lg`.

---

## Do's & Don'ts — no AI slop

**Do:** anchor on deep navy `--surface-base`; reserve electric blue for the brand mark, primary CTA, active nav, signal indicators, focus rings, and links only; carry depth with the surface ladder + hairline borders; pair feature sections with real product UI; keep to one gradient moment per viewport; put `tabular-nums` on every numeric / timestamp cell; **draw every chart and sparkline stroke from the slate-blue accent token** — a raw lime stroke like `#A8D600` is exactly the off-palette slop this forbids.

**Don't ship:** purple/indigo/violet gradient backgrounds or blue→purple schemes (our blue stays true-blue); glassmorphism; emoji as headings/bullets; the 3-identical-icon feature-card grid; "Empower / Unleash / Seamless" copy; centered-hero + 3-columns + pricing cookie-cutter; fake or round dashboard numbers; decorative charts with no data; stock-photo vibes; inconsistent spacing / mismatched radii / low-contrast gray-on-gray; anything that reads as a Tailwind template. Be specific, opinionated, branded.

---

## Constraints (enforced)

- **Theme-aware tokens only** (`--text-*`, `--surface-*`, `--border-*`, `--accent-*`). No hardcoded hex, no `text-white` / `bg-white` except `text-white` on a verified-contrast blue accent surface.
- **WCAG AA** on all text; real `:focus-visible` rings; full keyboard nav.
- **Honesty principle:** the landing promises only what the app delivers. Real sample data on marketing, never invented metrics or fabricated "detected changes." (Root fix for the "AI-slop / empty" tester feedback.)
- Frontend-only; do not break existing routes or the `/api/v1/*` contract.

---

## Known Gaps

- `globals.css` header comments still self-label "v3 Intelligence Desk / Archivo / slate-blue" (and an `html[data-theme="ink"]` "lime = signal" note) — stale vs the live v4 blue tokens the file now contains. Doc/comment drift, not a render bug, but it misleads anyone reading tokens.
- Error / empty-state styling isn't specified centrally — login uses `--tone-danger`; queue/settings carry one-offs. Needs a shared spec.
- Chart / sparkline palette lives in code (`lib/chart-theme.ts` + `useChartPalette()`), not in this doc.

---

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-19 | v4 "Signal Desk": blue, dark-first | Pivot from reverted lime experiment. Electric-blue (`#2e8bff`/`#1e6bff`) on deep navy `#080b14`; dark is default, paper kept as alternate. appkittie + Linear as structure/discipline anchors. |
| 2026-06-19 | One signature gradient moment per view | navy→azure radial glow behind hero only; blue is otherwise a flat, scarce accent (Linear discipline). Avoids the gradient-everywhere AI-slop trap. |
| 2026-06-19 | Big display scale added (80–92px, -0.045em) | Marketing first-impression needs appkittie-grade confident type; in-app stays denser. |
| 2026-06-19 | Honesty principle written into the system | Diagnosis: the UI over-promised data it didn't have. Landing + app must match. |

_Prior v3 history (paper default, oxblood→slate-blue swap, dual-theme shipping) retained in git; superseded by this doc for the blue redesign._
