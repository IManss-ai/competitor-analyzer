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

- [ ] **[high] Production checkout can't complete payment** — signup says "checkout after sign-in," but production Polar is misconfigured (sandbox token vs production-default server → 401 → graceful 503). Real trial users can't pay. Fix is built + held on `integration/polar-launch`, blocked on a verified production Polar account. Runbook: `docs/POLAR-GO-LIVE-RUNBOOK.md`. Not a frontend bug. (Not re-reproduced in the 2026-06-23 unauth QA run — flagged from prior investigation.)
