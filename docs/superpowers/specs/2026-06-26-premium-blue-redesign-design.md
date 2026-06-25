# Rivalscope — "Premium Blue" Whole-App Redesign — Design Spec

**Date:** 2026-06-26 · **Status:** locked, ready for implementation plan
**Branch:** `style/design-polish` · **Deliverable:** live, ported, deployed redesign on rivalscope.dev
**Supersedes the look of:** shadcn neutral-modern (zinc + single blue). Keeps its token *architecture*, replaces its *taste*.

---

## 1. Why

At the 2026-06-25 pitch, mentors called the live UI "AI slop": generic default-shadcn (zinc neutrals + one blue accent + Geist + flat 1px-border cards). The verdict (org decision, conf 1.0): **redesign the whole app in one pass; the look must come from an external source, not from-scratch AI taste; Claude ports, does not invent.** This spec is that external direction, locked with the founder, ready to port.

The slop was never the *blue* — it was the absence of craft (no display face, flat cards, no depth, even grids). So we **keep blue** (founder's explicit call) and fix the craft to a Mercury/Linear bar.

Companion doc: `docs/design-brief-2026-06-25.md` (product, IA, anti-slop guardrails, per-screen specs). This spec adds the **locked design system + token mapping + scope tiers**.

---

## 2. Provenance (how the system was sourced)

Extracted real design tokens from three founder-chosen references with **dembrandt** (`npx dembrandt <url> --design-md`, Playwright, local, no API key). Raw extracts saved at `docs/design-extracts/{linear.app,mercury.com,appkittie.com}.DESIGN.md`. Each reference contributes one layer:

| Reference | Contributes | Evidence from extract |
|---|---|---|
| **Mercury** | The premium polish **+ the blue** | primary `#5266EB` (already blue), layered multi-stop shadows, soft tinted elevation, 8pt spacing, generous radii |
| **AppKittie** (founder north-star) | Bones & energy | near-black surfaces `#0A0A0A`, big tight display scale, confident radii. *Its lime `#C8FF00` is dropped → blue.* |
| **Linear** | Data precision | Inter w/ `cv01 ss03` features, mono numerals (Berkeley Mono → Geist Mono), razor radii + subtle inset depth for dense tables |

Founder sign-off was on a rendered preview (`scratchpad/preview.html` → `preview.png`) plus a display-font comparison (`preview2.html` → `preview2.png`), not on description alone — the validation step skipped before the last pitch.

---

## 3. The locked system — "Premium Blue"

### 3.1 Type
- **Display (headlines, editorial moments): `Instrument Serif`, weight 400.** The "intelligence publication" voice. Used **only** at large sizes (≥ 28px): landing hero, page H1s, the Head-to-Head **verdict sentence**, battle-card section titles, big stat context headers.
- **UI / body: Geist Sans** (keep `--font-geist-sans`; the Inter-class workhorse the preview stood in for), 400–600. All functional headings (card titles, section labels ≤ 24px), body, nav, forms, buttons. Only **one** new font is added to the app: Instrument Serif.
- **Numerals / metrics / timestamps / kbd / mono chips: Geist Mono** (`--font-geist-mono`), `font-variant-numeric: tabular-nums`.
- **Hard rule:** Instrument Serif is a *display accent*, **never** on dense tables, form labels, buttons, nav, or small text. This sidesteps its single-weight limitation and keeps the dashboard legible.

### 3.2 Color (dark-first; both themes required)
- **Primary:** Mercury indigo `#5266EB` → `--primary: oklch(0.555 0.205 268)` *(finalize via exact #5266EB→oklch conversion at port time)*. Replaces today's `oklch(0.546 0.245 262.881)`. `--ring`, `--sidebar-primary`, the remapped `sky-*` scale all follow `--primary`.
- **Signature gradient (hero / primary CTA / logo mark only):** `linear-gradient(135deg, #5266EB, #7AA2FF)` (indigo → azure). This is the "different gradient" vs. AppKittie's green. **Not** used as a decorative background wash; **not** used on text (no gradient-text — it's an AI tell).
- **Semantic (reserved, never the brand):** win/positive green `#34D399` (dark) / `--tone-positive`; exposure/danger red `#FB7185` (dark) / `--destructive` `--tone-danger`; pricing amber `#FBBF24` / `--tone-warning`; repositioning indigo `--tone-repositioning`. Signal = primary blue.
- **Dark surfaces:** background ≈ `#0A0A0C`, card ≈ `#121216`, elevated ≈ `#16161C`, hairline `rgba(255,255,255,.07)`. **Light surfaces:** background soft-lavender white ≈ `#FBFBFE`, card `#FFFFFF`, subtle `#F6F7FB`, ink foreground.

### 3.3 Depth — the single biggest anti-slop fix
Replace flat `--shadow-card: none` with Mercury-grade layered elevation:
- **Dark `--shadow-card`:** `0 1px 0 rgba(255,255,255,.05) inset, 0 14px 28px -10px rgba(0,0,0,.7), 0 4px 10px -4px rgba(0,0,0,.5)`
- **Light `--shadow-card`:** `0 10px 16px rgba(28,28,35,.02), 0 6px 10px rgba(28,28,35,.04), 0 0 3px rgba(28,28,35,.09)` (Mercury's extracted values)
- `--shadow-card-hover` slightly stronger; keep/strengthen `--shadow-elevated` + `--shadow-modal` for overlays.

### 3.4 Radius
Bump confidence: `--radius: 0.75rem` (12px). Cards `rounded-2xl` (16px), inputs 8–10px, **primary CTAs pill** (`--radius-pill`). Badges/chips pill.

### 3.5 Motion (no spring/bounce — existing rule)
Keep `--ease-smooth` / `--ease-out` / `--duration-*`. Add: **count-up** on stat numerals, **blue signal-pulse** dot (live "watching" motif), **reveal-on-scroll** fades (via existing `motion/react`). Durations stay 100–240ms.

---

## 4. Token mapping (concrete `globals.css` + `layout.tsx` changes)

Most changes are **token-level** in `frontend/src/app/globals.css` `:root` + `.dark`, propagating through the **legacy alias layer** (`--surface-base`, `--text-primary`, `--accent-primary`, …) + the `sky-*`→`--primary` remap. **Verified against the codebase (2026-06-26 audit):** `0` hardcoded zinc/slate/gray neutrals and `0` raw hex in `.tsx` — so the **neutral + radius re-skin propagates for free**. Three things do **not** propagate by token-flip and are explicit Tier-0 work:
- **~25 hardcoded `blue-*` utilities across 8 `.tsx` files** (e.g. `bg-blue-600`) → convert to `--primary`/`sky-*`. Stock `blue-*` ignores `--primary`; only the remapped `sky-*` follows it.
- **Depth:** the shadcn `<Card>` uses `ring-1 ring-foreground/10` and **no box-shadow** — it does **not** read `--shadow-card`. Mercury depth is added in the shared `frontend/src/components/ui/card.tsx` (one file → all cards) and aligned with ad-hoc `shadow-sm/lg` usages (notably `dashboard-client.tsx`).
- **Display serif** never propagates by token; `.font-display` is applied per component on headlines.

1. `--primary` (+ `.dark` variant) → Mercury blue oklch; `--ring`, `--sidebar-primary`, `--sidebar-ring` follow.
2. Add `--font-display: var(--font-instrument-serif), Georgia, serif;` and wire **Instrument Serif** via `next/font/google` in `layout.tsx` (alongside Geist). Add a `.font-display` utility / use on display elements.
3. `--shadow-card` / `--shadow-card-hover` → layered values (§3.3), per theme.
4. `--radius` → `0.75rem`; verify `--radius-*` scale + shadcn `<Card>` read it.
5. Add `--gradient-primary` token for the signature gradient; apply to primary CTA + logo mark + hero accent only.
6. Tune dark `--background`/`--card`/elevated tokens to the near-black set; tune light to lavender-white set.
7. Semantic `--tone-*` + `--destructive` confirmed against new badge hues in both themes.

**Constraint:** the frontend is a **modified Next 16** — `frontend/AGENTS.md` requires reading `node_modules/next/dist/docs/` before writing code (font loading + App Router APIs may differ). Do this before touching `layout.tsx`.

---

## 5. Scope tiers — what "live today" means honestly

**Tier 0 — Foundation (lifts ALL routes; partly propagating, partly per-component):** (a) token swap — primary→Mercury blue, radius, dark/light surfaces (neutrals propagate free, verified); (b) convert the ~25 hardcoded `blue-*` utilities; (c) add Mercury depth in the shared `card.tsx`; (d) restyle the **global shell** (sidebar nav groups, topbar, account chip, theme toggle, pill primary CTA); (e) wire **Instrument Serif** + apply `.font-display` to headlines in shared components. **Lead with the propagating color/radius win** (cheap, every screen improves at once), then the bounded per-component depth/serif/blue-fix. Ship + verify both themes before Tier 1.

**Tier 1 — Bespoke today (the demo path / where the pitch is won):**
- **Landing `/`** — art-directed hero (Instrument Serif headline, gradient CTA, live battle-card demo), pricing, how-it-works.
- **Onboarding modal** — the "magic moment" (URL → business profile → auto-discovered competitors), beautiful loading state.
- **Head-to-Head `/competitors/[id]`** — THE wow screen: verdict sentence + Wins / Exposures / Plays with `ⓘ inferred` evidence tags.
- **Dashboard `/dashboard`** — stat cards (count-ups, sparklines, typed change badges), competitor health grid, intel feed. Reuse shadcn's **prebuilt dashboard / sidebar blocks**, re-themed, rather than hand-rolling — the founder asked for "shadcn for dashboard components," and re-theming a vetted block is faster and exactly that.

**Tier 2 — System-reskin-only today, bespoke polish deferred:** Battle Cards, Trends (custom charts), Campaigns, Action Queue, Discover, Settings, Login, share, billing success. These inherit Tier 0 (premium look) but keep current layout/charts until a follow-up pass. **This deferral is explicit, not silent.**

---

## 6. Signature components (spend design here — from brief PART 4)
1. **Head-to-Head verdict** — Wins/Exposures/Plays, evidence-revealing `inferred` tags. The product; most design budget.
2. **Battle Card** — 4 quadrants + 5 ranked copy-to-clipboard plays, as a designed dossier.
3. **Stat cards** — count-up mono numerals, sparklines, typed change badges (`$` pricing / `+` feature / `↻` repositioning).
4. **Provenance panel** — real-vs-AI-inferred sources (the honesty signal; a brand value).
5. **Live signal motif** — blue pulsing "watching N" dot/ticker.

---

## 7. Acceptance criteria

**Anti-slop (brief PART 5), each screen:**
1. Distinguishable from a default v0/shadcn template — YES.
2. Real display typeface in headlines — Instrument Serif. ✓
3. Signature color beyond gray+blue — **consciously overridden**: blue retained per founder; distinctiveness carried by display serif + layered depth + editorial layout + gradient + the elevated Mercury hue (not stock-Tailwind blue). Documented, not accidental.
4. Clear focal point / hierarchy, not an even grid — ✓
5. Intentional depth/material — Mercury layered shadows. ✓
6. Data-viz looks designed — Tier 1 now; Tier 2 charts deferred (noted).
7. Motion adds life without bouncing — ✓
8. Premium enough to charge $49/mo — the bar.
9. Works in BOTH dark and light — verified in a real browser per screen.
10. An investor would call it beautiful, not "clean."

**Functional (no regressions):** real API data + Polar billing intact; provenance/honesty UI preserved; shadcn primitives + CSS-var tokens only (no raw hex outside token defs; no raw `text-white`/`bg-white` except verified-contrast accent surfaces); accessible contrast on every surface; both themes correct.

**Done today =** Tier 0 + Tier 1 ported, both themes verified in browser, deployed to rivalscope.dev (Vercel auto-deploy on push to `main`), prod smoke-checked.

---

## 8. Risks & mitigations
- **Instrument Serif is single-weight + itself trendy** → confine to large display only (§3.1); founder chose it explicitly over Clash/Bricolage/Space Grotesk.
- **Serif legibility at small sizes** → never used below 28px; all functional text is sans.
- **"Blue + shadcn ≈ the rejected slop"** → mitigated by elevated Mercury hue + serif display + layered depth + editorial layout; we change 4 of the 5 slop signals, keep only the hue (founder's call).
- **Same-day live deploy of 14 routes** → two-tier scope; Tier 0 token swap does the heavy lifting via the alias layer; bespoke effort concentrated on 4 demo-path screens.

---

## 9. Out of scope
Backend/API changes; Polar billing logic; new product features; Tier 2 bespoke chart redesigns; removing the legacy alias layer (P4); mobile-native. Responsive must still *work* (desktop-first), just not be art-directed on Tier 2.
