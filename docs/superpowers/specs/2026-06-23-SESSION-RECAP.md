# Session Recap — 2026-06-23 (handoff for a fresh terminal)

Read this first in a new session, then `CLAUDE.md`. This captures everything from the long 2026-06-23 session and exactly where to resume.

---

## TL;DR — what to do next

We are mid-way through a **whole-app shadcn re-theme**. The design spec and implementation plan are **written, approved, and committed**. Execution (subagent-driven) **has not started** — the first subagent dispatch was blocked by an Anthropic API overload (transient infra, 0 work done). **Resume at Task 0.1.**

- Spec: `docs/superpowers/plans/../specs/2026-06-23-shadcn-retheme-design.md`
- Plan: `docs/superpowers/plans/2026-06-23-shadcn-retheme.md`
- Next action: run the plan via **superpowers:subagent-driven-development**, starting at **Task 0.1** (create branch `feat/shadcn-retheme`, `shadcn init`, toolchain proof). **Make-or-break:** shadcn CLI on Tailwind v4 + Next 16 + React 19 — use `npx shadcn@canary init` if `@latest` fails; if canary also fails, STOP and rethink (don't hand-fake config).

---

## The shadcn re-theme (current work)

**Goal:** Re-theme the ENTIRE frontend (landing + auth + ~10 dashboard screens) from the v4 "Signal Desk" look to clean **shadcn/ui neutral-modern**.

**Locked decisions (from brainstorming):**
- Whole app, one effort (phased plan).
- Look: shadcn neutral-modern; **zinc** neutrals, **single blue** accent, **new-york** style, **0.5rem** radius.
- Font: **Geist Sans + Geist Mono** (replaces Space Grotesk + IBM Plex Mono).
- Light + dark both; **dark-first default** (fresh visitor → `.dark`; saved choice persists). Theme = the `.dark` class (replaces `data-theme="ink|paper"`).
- **Approach A:** init shadcn + define shadcn token layer in `globals.css` + **alias the existing custom tokens to it** (one change shifts the whole app's palette/radius/borders), then replace hand-rolled components with shadcn primitives + restyle bespoke pieces screen-by-screen; retire aliases at the end.

**Plan phases:** P0 foundation (init, cn, token+alias layer, Geist, `.dark` theming, primitives) → P1 landing → P2 auth+shell → P2... → P3 dashboard screens (3.1–3.10) → P4 cleanup (retire aliases, rewrite DESIGN.md/CLAUDE.md, e2e).

**Constraints:** branch `feat/shadcn-retheme` (off main); NEVER push to main during the work; verify on a Vercel preview; behavior/props must NOT change (esp. `userId`/`apiToken` auth props — skin only); per-task gate = `npm run build` clean + light/dark screenshots (it's a visual re-theme, not unit-TDD).

**Execution status:** NOT STARTED. Branch `feat/shadcn-retheme` not created. SDD ledger at `.superpowers/sdd/progress.md` (gitignored scratch); Task 0.1 brief at `.superpowers/sdd/task-0.1-brief.md`. Base commit for the branch = the latest main.

**Frontend shadcn-readiness (already checked):** no `components.json`, no `cn()` helper, no `tailwind-merge` yet — but `class-variance-authority`, `clsx`, `lucide-react`, Radix primitives, and hand-rolled `ui/button|label|switch` are already present. So it's shadcn-adjacent, not greenfield.

---

## Everything else shipped/open this session

### ✅ Live on production (deployed to main)
- Design fixes: CTA spring→ease, floating-badge `--shadow-elevated` token (FINDING-001/002).
- Edge-case test harvest: 14 suites merged via **PR #20**.
- **CLAUDE.md updated to v4 "Signal Desk"** (was stale at v3) — `5d95a2b`. NOTE: the shadcn re-theme will supersede this again at P4.
- Session spec docs + TODOS entries.
- (Production backend `/health` confirmed live commit during the session.)

### ✅ Built + verified, NOT merged/deployed (need deliberate deploy)
- **Auth hardening — PR #21**, branch `fix/auth-hardening-signed-token`. Fixes the HIGH broken-auth hole (API bearer was the raw `user_id` UUID, no signature/expiry; random UUID → 200 in prod). Now a signed `api_token` via `app/auth.resolve_bearer_user_id` (single gate; also closed `discovery._optional_user`). 528 backend tests green; frontend build clean. **Browser E2E NOT yet run.**
  - **MANDATORY ROLLOUT (non-atomic deploy):** set Railway `ALLOW_LEGACY_UUID_BEARER=true` → merge/deploy both halves → verify login→dashboard→add-competitor → set it `false`. Do NOT casually push to main. (See `docs/.../2026-06-23-AUTH-HARDENING-SPEC.md` + memory `auth-hardening-pr21`.)
- **Polar trial-freeze enforcement** — branch `integration/polar-launch` (held). Backend 402 read-only gates + frontend banner/gating. Merges after production Polar works.

### ⛔ Blocked on the user (not code)
- **Production Polar billing / real revenue.** The product works end-to-end on trial (verified e2e: signup → dashboard → add competitor → scan → AI battle card, all live), and the broken checkout degrades gracefully ("trial active, payments coming"). But it CANNOT take money until a **verified production Polar org** exists (the "parked on mom's ID" item) → then ~10 min per `docs/POLAR-GO-LIVE-RUNBOOK.md`. This is the one thing between the funnel and revenue.

### 🔧 Minor leftover
- Test account `e2e-check-20260623@example.com`: its competitor (linear.app) + data were DELETED from prod; the **empty account row remains** (no delete-account endpoint; prod DB is `postgres.railway.internal` internal-only; `railway run` errored). Harmless. Guarded delete script at scratch `delete_test_user.py` if `railway run` is fixed.

---

## Key project facts (for a cold start)
- Frontend: Next.js 16 App Router + Tailwind v4 + React 19, in `frontend/`. Backend: FastAPI + SQLAlchemy in repo root; tests `./venv/bin/python -m unittest discover -s tests -p "test_*.py"`.
- Prod: frontend Vercel (rivalscope.dev), backend Railway. Both auto-deploy on push to `main` — so `main` = production; deploy deliberately.
- Git push quirk: use `env -u GITHUB_TOKEN git push ...` (invalid GITHUB_TOKEN env shadows the good gh token).
- AI: DeepSeek (OpenAI-compatible) via `app.llm`; the OpenAI/Anthropic providers were migrated out.
