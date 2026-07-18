# TODOS

## Design — landing page (pre-existing, found by /design-review 2026-06-18)

Originally audited against DESIGN.md v3. **Re-verified by /design-review 2026-06-23 against DESIGN.md v4 "Signal Desk" (live, ink-default) — this section is now substantially closed.** Latest report: `.gstack/design-reports/design-audit-rivalscope-dev-2026-06-23.md`.

- [x] **[medium] Hardcoded ink-theme accent hex breaks dual-theme** — RESOLVED. Raw `#3f6a9c`/`#6a96c8` are gone; `sky-950` is now a per-theme token (`#172534` paper / `#0a2550` ink).
- [x] **[medium] `SPRING` transition on hover** — Fixed by /design-review on `main` 2026-06-23 (FINDING-001, `42a7388`): both CTAs now use `--duration-base` + `--ease-out`, no spring.
- [x] **[medium] `shadow-md` on the floating "live" badge** — Fixed by /design-review on `main` 2026-06-23 (FINDING-002, `3cc4492`): now `shadow-[var(--shadow-elevated)]`.
- [x] **[polish] Off-8pt-scale spacing** — Substantially resolved by the 2026-06-22 half-step→8px migration. Remnant: `gap-7` on the desktop nav (`page.tsx:209`), left as a deliberate half-step (visually fine on a 3-item nav).
- [x] **[polish] `animate-pulse` ignores `prefers-reduced-motion`** — RESOLVED. `globals.css:627-630` collapses all animation/transition durations to 0.01ms under reduced-motion, covering Tailwind `animate-*`.

> Note: `text-white` on the primary accent button is **not** a finding — DESIGN.md:137 explicitly allows it ("`text-white` is allowed here — accent surface").
> Doc debt: `CLAUDE.md` still describes the v3 system as "Live now"; live is v4 "Signal Desk" (see DESIGN.md). Update when convenient.

## Billing (found by /qa 2026-06-23, deferred)

- [x] **[high] Production checkout can't complete payment** — RESOLVED 2026-06-25: production Polar creds live on Railway (SaaS $49 / Local $19), checkout verified against prod; re-verified end-to-end 2026-07-13. Note: Polar 422-rejects undeliverable emails — QA with a deliverable address.

## Design — deferred by /design-review 2026-07-15 (full report: `~/.gstack/projects/IManss-ai-competitor-analyzer/designs/design-audit-20260715/`)

Fixed same day on `main` (d9a04d1..496c14a, 11 commits): light-mode AA on status colors, exposed-column glyph, landing badge shades, focusable copy control + aria-labels, transition-all in ui primitives, dashboard reduced-motion, stats-card tone tokens, 44px nav hit areas, 12px footer labels, /apps row compaction. Deferred:

- [x] **[high, data] /apps index is hollow** — CODE FIXED 2026-07-18 (`e56a18b` + `dbdff2d`): root cause was enrichment never running in prod + tech detection fed markdown instead of raw HTML. Shipped: sidecar `{text, html}`, scanner rework, hollowness re-selection, `scripts/enrich_apps.py` (mock-poisoning hard-abort), facets endpoint + page_size, organic catalog growth on competitor-create, AND search + category/tech filter toolbar on /apps. **REMAINING: one-off prod run** — deploy, then `railway ssh` → `python scripts/enrich_apps.py --dry-run --slug stripe` spot-check → full run (~15-40 min, ~$0.10 LLM); /apps ISR = visible within 1h.
- [x] **[medium, data] Public share cards leak LLM filler** — FIXED same day (de-slop pass, `ce9b8a5` + `9b58612`): meta-filler lines are stripped in `lib/llm-meta.ts` on every card surface AND server-side before RSC serialization on `/share/[id]`; generation prompts now forbid em dashes and input-referencing disclaimers at the source (`fc17ca9`). Cached cards regenerate clean on next intel.
- [ ] **[medium] Blue spent as a category color on landing** — TONE maps color the "feature" badge `text-primary` while in-app `feature_add` is green; in-file note documents amber/primary/emerald as deliberate. Decide: align with in-app semantics or keep the landing triad.
- [ ] **[medium] height:auto expand/collapse animations ×7** — competitor-detail-client:491,643,685,722,759 + competitor-manager:160,223 animate a layout property (DESIGN.md: transform/opacity only). Swap for opacity/clip or measured transforms when touching these files.
- [ ] **[medium] No h1 on main app pages** — dashboard/trends/queue/battlecards/competitor-manager start at h2/h3; landmark outline inconsistent.
- [ ] **[medium] Touch targets in-app** — shadcn size variants (xs 24px, sm/icon-sm 28px, icon 32px) used across queue/competitors/battlecards; systemic fix = size-variant overhaul, deliberately not done 2 days before demo.
- [ ] **[polish, systemic] Spacing scale fork (~190 off-scale utilities) + type scale fork (240+ arbitrary px sizes incl. 9/9.5px)** — tokens exist, nothing enforces them; consider a lint rule (see Octarin verified-pattern: automate color/token checks in CI).
- [ ] **[polish] Motion durations ignore `--duration-*` tokens**; pricing section leaves right third empty; orphaned "New · battle cards" hero link; decorative blue rule in how-it-works; single `xl:` breakpoint use on login.

## /qa 2026-07-16 (pre-demo full sweep; report: `.gstack/qa-reports/qa-report-rivalscope-dev-2026-07-16.md`)

Fixed same day on `main` (34463df..6e3843e, 11 commits, all verified on prod): LLM filler regex over-stripping real intel (+ hedge-tail follow-up), competitor-detail card missing the meta-filler pass, hero counter dead-zone on mobile, 0.0-star zero-signal review rows, share-page array guards, route titles for login/terms/privacy, share soft-404 to real 404, baseline security headers, backend em-dash scrub, prod /docs gating. Deferred/flagged:

- [x] **[flag, brand] /beat "$29" CTA mails dzakpelov@gmail.com** — FIXED 2026-07-18 (`2c347ab`): mailto fallback now support@rivalscope.dev. Address remains in git history (history rewrite deliberately not done).
- [x] **[low, ux] Read-only upsell toast has no dismiss button** — FIXED 2026-07-18 (`2c347ab`): X button, sessionStorage-scoped, hard PaywallOverlay untouched/never dismissible.
- [x] **[low, security] Login error confirms account existence (enumeration)** — FIXED (copy scope) 2026-07-18 (`2c347ab`): wrong-password 401 now uniform "Incorrect email or password." Residual by design: enumeration via outcome (unknown email = instant signup, passwordless = 403 magic-link) is intrinsic to instant-signup; product decision if ever revisited.
- [x] **[low, cosmetic] Rating Trend x-axis repeats "Jun 25" ×3 on single-scan accounts** — FIXED 2026-07-18 (`2c347ab`): distinct-date ticks, axis hidden below 2 distinct dates.
- [x] **[infra, test] No frontend test framework** — FIXED 2026-07-18 (`9601ef1`): vitest bootstrapped (`npm test`, 50 tests), 25-case repro committed as `src/lib/llm-meta.test.ts` — llm-meta regex changes now require `npm test`, superseding the ad-hoc node repro rule below.

## Demo-video dry run 2026-07-16 evening (report: `.gstack/qa-reports/qa-report-rivalscope-dev-2026-07-16-demo-rehearsal.md`)

Rehearsed the on-camera flow (signup → discovery → scan → battle card) 3× on prod, clean every time. Recommended demo company: **stripe.com** (15s discovery, PayPal-first report, all 4 rivals' review intel populated in-flow). All findings low, deferred:

- [x] **[low, ux] `/auth/signup` returns 404** — FIXED 2026-07-18 (`2c347ab`): `/auth/signup` + `/signup` redirect to `/auth/login` via next.config. Post-deploy: verify 307 with cache-busting query (Vercel edge-caches the old 404).
- [ ] **[low, cosmetic] Free-test sidebar label races the scan** — right after the initial scan, dashboard sidebar says "1 free test available" while battlecards page says "Free test used"; corrects on next dashboard load.
- [ ] **[watch, content] First-scan Strategic Signals use hedge phrasing off zero-change baselines** ("No changes suggest X is stagnant or confident…") — phrasing differs from the stripped "No X detected" family; reads as analysis, but keep an eye on it. Do not extend `llm-meta.ts` regex without the 25-case repro.
- [ ] **[cleanup] Delete 3 rehearsal accounts post-demo** — `manssjones+rehearsal{1,2,3}@gmail.com` in prod DB (cascade-delete via `railway ssh`).
