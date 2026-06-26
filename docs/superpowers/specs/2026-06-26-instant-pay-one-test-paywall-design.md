# Instant Pay + One-Test Paywall — Design

**Date:** 2026-06-26
**Status:** Awaiting founder review
**Author:** Claude (brainstorming session)

## Goal

Move Rivalscope from a cosmetic, unenforced 2-day free trial to a **usage-based freemium model**:

> A new user gets the **complete Pro experience for exactly one test**. After that one test, the app **locks** until they pay. Paying charges them **immediately** (no trial delay) and instantly restores full access.

This is driven by a real customer who subscribed to Pro but won't be charged for 2 days, and the founder's intent to convert on first value rather than wait out a timer.

## Current state (verified 2026-06-26)

- **No paywall exists on `main`.** Trial and paid users get identical features. Trial expiry is not enforced. `models.py` sets `subscription_status="trialing"` and `trial_ends_at = now + 2 days`, but nothing reads `trial_ends_at` to gate anything.
- **Polar checkout works in prod.** `/api/v1/billing/checkout-url` creates real $49/$19 sessions; the webhook flips `subscription_status="active"` on payment. `app/billing.py` passes **no trial parameter**.
- **The 2-day *charge* delay is a trial configured on the Polar product itself** (Polar dashboard), not in our code. In the Polar SDK, trials are a product/price-level setting; `CheckoutCreate` has no trial override. So this is fixed in the Polar dashboard, not in code.
- **A complete, tested enforcement system already exists, unmerged**, on `feat/polar-readonly-enforcement` / `integration/polar-launch`:
  - `app/access.py` — `access_level(user) → "full" | "read_only"`, `is_read_only()`, and a `require_write_access` FastAPI dependency that 402s locked users. Drop-in replacement for `require_api_user`.
  - Value endpoints already swapped to `Depends(require_write_access)`: add/update competitor, scan now, scan reviews, approve queue action; battle-card generation 402s read-only callers.
  - Frontend: `lib/access.ts`, `read-only-banner.tsx`, 402 handling in `lib/api.ts`, access-aware UI across dashboard/competitors/queue/settings/sidebar/battle-card/scan buttons.
  - `tests/test_access_level.py` (232 lines) and `docs/POLAR-GO-LIVE-RUNBOOK.md`.
  - **It enforces a *time-based* trial** (full while `trialing` and `trial_ends_at` in future → `read_only` after). We will reuse the plumbing and change only the lock *condition* to usage-based.

## Decisions (locked with founder)

1. **Free tier:** full product for **one test**, then hard lock. (Not blurred/partial.)
2. **Existing non-paying users:** **locked too** on rollout (no grandfathering). Founder account is comped.
3. **Polar product trial removal:** founder does the **dashboard toggle** (Products → Rivalscope Pro $49 / Local $19 → Free trial → None).

## Design

### Part 1 — Instant charge (Polar product trial)
- **Founder action, documented, no code:** remove the free-trial setting from the Pro ($49, `a0827598`) and Local ($19, `6afc7623`) Polar products so checkout charges the card immediately.
- **Existing mid-trial customer:** founder's money decision — either "End trial" in Polar to charge now, or let Polar auto-charge at day 2. Not automated.
- We add a short runbook section so this is repeatable.

### Part 2 — Trial model → usage-based "one test"
- Add a boolean **`free_test_used`** to `User` (migration), default `False`.
- Set `free_test_used = True` when the user gets their first real value — **whichever happens first**: their first competitor's first scan completes, OR their first battle-card / head-to-head report is delivered. Both are normal in onboarding (add competitor → scan → auto-generate card); using "whichever first" closes the hole where a user skips onboarding, adds a competitor manually, and never opens a report. Setting it *after* the value is delivered guarantees the first test completes fully before any lock.
- The 2-day `trial_ends_at` time-trial is retired as the access driver. (Column may remain for display/back-compat but no longer gates access.)

### Part 3 — Enforcement (reuse `app/access.py`, flip the condition)
Change `access_level()` to usage-based:

```python
def access_level(user) -> str:
    if PAYWALL_ENABLED is False:          # feature flag — ships dark
        return "full"
    if user.subscription_status == "active":
        return "full"                     # paid → never locked
    if user.email in COMPED_EMAILS:
        return "full"                     # founder / comped accounts
    if not user.free_test_used:
        return "full"                     # still has the one free test
    return "read_only"                    # one test used, not paying → locked
```

- Everything else in `access.py` (the `require_write_access` 402 dependency, `is_read_only`) is reused unchanged.
- Backend wiring (port from the branch onto current `main`): swap `Depends(require_api_user)` → `Depends(require_write_access)` on the value endpoints (add/update competitor, scan now, scan reviews, approve action) and keep the battle-card-generation 402 guard.
- Reads stay open everywhere (the user can still *see* their one test's results — this maximizes conversion vs. a blackout).
- **Scheduler:** port the branch's `scheduler.py` change so weekly scans run only for **full**-access users. A locked free user stops getting ongoing monitoring (it's a paid feature) — part of "everything locks."

### Frontend
- Port `lib/access.ts` + 402 handling in `lib/api.ts` onto current `main`.
- `/api/v1/settings` (the `/me` payload) gains an **`access_level`** field (`"full" | "read_only"`) so the client knows the lock state in one read.
- **Hard-lock feel:** for `read_only` users, show a prominent **full-screen paywall overlay** over the app shell — "Your free test is done. Upgrade to Pro for full, ongoing access." with a single CTA: **"Upgrade to Pro — billed today"** → existing `/api/v1/billing/checkout-url` → Polar checkout → instant Pro. (Reuses the branch's `read-only-banner` styling, upgraded from a banner to a blocking overlay to match the "everything locks" decision.) Reads behind it stay viewable but every action routes to upgrade.
- The "billed today" copy is safe to state once Part 1 (Polar trial removal) is done.

### Data model
- `users.free_test_used BOOLEAN NOT NULL DEFAULT false` — Alembic migration.
- Backfill: existing non-active users → `free_test_used = true` (so they're locked on rollout per the founder decision); active users unaffected.
- Founder comp: `COMPED_EMAILS` config (env, comma-separated) including `nodes.kazakhstan@gmail.com`. No row mutation needed; checked in `access_level()`.

### Never-lock guarantees
- `subscription_status == "active"` → always full.
- `COMPED_EMAILS` → always full (founder).
- `PAYWALL_ENABLED=false` → access_level always returns `"full"` (the whole feature is inert until flipped).

## Rollout plan (protects the paying customer)
1. Ship all code with `PAYWALL_ENABLED=false`. Nothing changes for anyone.
2. Run the migration (adds column, backfills).
3. On prod, verify via the `/settings` payload that `access_level` resolves correctly **while the flag is still off**: `"full"` for active/comped and `"read_only"` for a used-up free account. **Explicitly confirm the real paying customer's account resolves to `"full"`** (it should be `active` from the webhook); if it shows `trialing`/anything else, add their email to `COMPED_EMAILS` as a safety net before the flip so a paying customer is never locked.
4. Founder removes the Polar product trial (Part 1).
5. Flip `PAYWALL_ENABLED=true`. Watch the paying customer + founder accounts stay full.

## Verification
- **Unit:** adapt `tests/test_access_level.py` (232 lines already cover the matrix) to the usage-based condition + comp + flag. Backend must stay green: `./venv/bin/python -m unittest discover -s tests`.
- **Local backend won't boot** (known issue), so end-to-end is verified against the deployed Railway backend after a dark deploy, using the `/settings` `access_level` field and a free vs. comped vs. active account.
- Frontend: a `read_only` account shows the paywall overlay and a `full` account does not; checkout opens and (after Part 1) a real charge lands immediately.

## Out of scope
- The Polar dashboard trial removal and the existing customer's charge (founder actions; documented, not automated).
- Annual billing, multiple Pro tiers, proration.
- Re-merging the stale frontend component diffs from the enforcement branch verbatim (the redesign diverged them; we re-apply the access logic onto current components instead).

## Risks
- **Locking a paying user.** Mitigated by: `active` bypass + `COMPED_EMAILS` + feature flag + staged verification (step 3 before flip).
- **Onboarding self-lock.** Mitigated by setting `free_test_used` only *after* the first report is delivered, never before/during.
- **Stale branch merge conflicts** on frontend. Mitigated by porting the access logic onto current files rather than merging the branch.
- **Backend can't boot locally.** Mitigated by unit tests + dark-deploy verification on Railway.
