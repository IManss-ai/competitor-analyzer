# TODOS

## /qa 2026-07-21 (full funnel audit; report: `.gstack/qa-reports/qa-report-rivalscope-dev-2026-07-21.md`)

Zero new bugs found — landing, signup, onboarding, discovery, free-test scan, battle cards (cache + paywall), Polar checkout, competitor add/remove, /apps, /discover, mobile all verified working. Two investigated leads ruled out as tooling artifacts (discovery modal viewport crop, screenshot-vs-`position:fixed` overlay mismatch), documented in the report so future QA doesn't re-chase them.

- [x] **[ops, hygiene] 4 QA test accounts accumulated in prod, never cleaned up** — CLEANED UP 2026-07-21: `manssjones+qacheck@gmail.com` (07-01), `+qa20260708` (07-08), `+qa0718` (07-18), `+qa1784630190` (07-21) removed via a one-time, dry-run-verified, dependency-ordered cascade-delete script (182 rows across 12 tables, single transaction, committed via `railway ssh`). Verified 0 remaining `manssjones+qa%` accounts. Gotcha hit and fixed: these FKs have no `relationship()`/cascade config, so the ORM's unit-of-work has no cross-table dependency graph — deleting objects across tables in one `flush()` executes in an unpredictable order, not insertion order (first attempt hit a `snapshots_competitor_id_fkey` violation). Fix: explicit `db.flush()` after each table's deletes, still inside one transaction/commit. Script deleted from the container after running — not left behind. **Still open:** no self-serve account-deletion endpoint exists, so this will recur every QA session; founder call on whether to build one.

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
- [ ] **[medium] Blue spent as a category color on landing** — TONE maps color the "feature" badge `text-primary` while in-app `feature_add` is green; in-file note documents amber/primary/emerald as deliberate. Decide: align with in-app semantics or keep the landing triad. (Founder call — deliberately left open 2026-07-18.)
- [x] **[medium] height:auto expand/collapse animations ×7** — FIXED 2026-07-18 (`f3dcd60`): grid-rows 0fr→1fr + opacity technique, aria-expanded, var durations.
- [x] **[medium] No h1 on main app pages** — FIXED 2026-07-18 (`f3dcd60`): one h1 per page (Topbar owns it), card headings demoted, nav aria-labels.
- [x] **[medium] Touch targets in-app** — FIXED 2026-07-18 (`8db435e`): ≥44px hit areas on all interactive primitives via transparent centered `::after` overlay (zero visual change); missing aria-labels added.
- [x] **[polish, systemic] Spacing/type scale fork** — FIXED 2026-07-18 (`edc4fe2`): 389 utilities migrated (469→80 allowlisted remnants), `npm run lint:tokens` enforces going forward (`frontend/scripts/check-design-tokens.mjs` + allowlist).
- [x] **[polish] Motion durations / hero link / blue rule / login breakpoint** — FIXED 2026-07-18 (`4dc05e1`). Pricing right-third layout deliberately unchanged (design call).

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
- [x] **[low, cosmetic] Free-test sidebar label races the scan** — FIXED 2026-07-18 (`4dc05e1`, same commit as the breakpoint/duration polish pass): sidebar now re-fetches `/api/v1/settings` on every route change AND explicitly again 3s after `Scan all now` completes, so the label can't trail the battlecards page. Verified by code inspection 2026-07-21 (matches the exact race described here); this TODO item was just never checked off when the fix shipped.
- [ ] **[watch, content] First-scan Strategic Signals use hedge phrasing off zero-change baselines** ("No changes suggest X is stagnant or confident…") — phrasing differs from the stripped "No X detected" family; reads as analysis, but keep an eye on it. Do not extend `llm-meta.ts` regex without the 25-case repro.
- [ ] **[cleanup] Delete 3 rehearsal accounts post-demo** — `manssjones+rehearsal{1,2,3}@gmail.com` in prod DB (cascade-delete via `railway ssh`).
