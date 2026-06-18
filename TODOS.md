# TODOS

## Design — landing page (pre-existing, found by /design-review 2026-06-18)

Audited against DESIGN.md v3 "Intelligence Desk". None block any current merge; these are pre-existing landing-page debt unrelated to the `design-review-landing` branch fixes. Full report: `~/.gstack/projects/IManss-ai-competitor-analyzer/designs/design-audit-20260618/`.

- [ ] **[medium] Hardcoded ink-theme accent hex breaks dual-theme** — `frontend/src/components/ui/how-it-works-panels.tsx:229` (`stroke="#3f6a9c"`), `:274` (`'#6a96c8'`), `:316` (`bg-sky-950`), `:425-426` (`'#6a96c8'`, `rgba(79,124,176,…)`). Ink-accent values baked into markup; don't switch for the paper default theme. Fix: source from `--accent-primary` / `--accent-subtle` / `--accent-border`. (Low visual impact: small scanner dots + a dark corner triangle on paper.)
- [ ] **[medium] `SPRING` transition on hover** — `frontend/src/app/page.tsx:131,328,731`. DESIGN.md:154 drops spring physics; use duration tokens (≤240ms, ease-out). `whileHover={{ scale: 1.02 }}` is arguably off-spec too.
- [ ] **[medium] `shadow-md` on the floating "live" badge** — `frontend/src/components/ui/how-it-works-panels.tsx:171`. DESIGN.md:51/146: card shadows are `none` (flatness is the brand). Drop, or use `--shadow-elevated` if genuinely floating.
- [ ] **[polish] Off-8pt-scale spacing** — scattered `gap-7`(28), `py-3.5`(14), `gap-2.5`(10), `mt-1.5`(6) in `page.tsx` + `how-it-works-panels.tsx`. Scale is `4 8 12 16 24 32 40 48 64` (DESIGN.md:160). Snap to nearest step.
- [ ] **[polish] `animate-pulse` ignores `prefers-reduced-motion`** — `how-it-works-panels.tsx:173,256,353`. Framer motion is covered by `MotionConfig reducedMotion="user"`, but raw Tailwind `animate-pulse` is not unless globally disabled. Verify global reduced-motion CSS kills Tailwind `animate-*`.

> Note: `text-white` on the primary accent button is **not** a finding — DESIGN.md:137 explicitly allows it ("`text-white` is allowed here — accent surface").
