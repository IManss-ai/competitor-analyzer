# Design — Polar Payments Go-Live + Launch-Readiness

**Date:** 2026-06-23
**Status:** approved (brainstorming) → ready for implementation plan
**Owner:** T3 orchestrator; executed by T1 (backend), T2 (frontend), user (ops)

## Goal

Make rivalscope.dev take **real money via Polar** and be fully functional for launch. The Polar integration code largely exists (checkout/portal/webhook, env-driven server, `/billing/checkout` page); the gaps are (1) production credentials and (2) a paywall that makes paying necessary. This adds the missing enforcement, billing UX, legal basics, and a verified go-live.

## In scope (today)

1. **Production Polar wiring** — live org, products, token, webhook, Railway env.
2. **Read-only freeze enforcement** — trial-expired + unpaid users go read-only.
3. **Billing UX** — working "Upgrade to Pro" / "Manage subscription"; read-only banner + disabled actions.
4. **Legal/compliance basics** — refund + cancellation terms; checkout/billing link to Terms & Privacy.
5. **End-to-end verification** — sandbox first, then production smoke.

## Out of scope (fast-follow, explicitly deferred)

Password reset (F5), auth hardening (raw-`user_id` bearer — see `2026-06-23-AUTH-HARDENING-SPEC.md`), signup-affordance polish (F4), share button (F8). Not launch-blockers per product decision.

## Key decision — enforcement mechanism

**Approach A: computed access-level.** No new DB state, no flip job. A backend helper derives access at request time; a shared dependency guards the paid/write endpoints; the frontend reads the same status and mirrors the UI. Single source of truth, can't drift, no launch-day migration. (Rejected: status-flip cron — race windows; generic write-middleware — over-broad, would block billing/logout/cancel.)

### `access_level(user)` definition (the single source of truth)

```
def access_level(user) -> "full" | "read_only":
    if user.subscription_status == "active":
        return "full"
    if user.subscription_status == "trialing" and user.trial_ends_at and user.trial_ends_at > now_utc():
        return "full"
    return "read_only"   # trial expired, or canceled / past_due / revoked
```

`read_only` = data is viewable, but value-producing actions are blocked and background scans pause.

## Workstreams

### WS1 — Polar production go-live (user / ops; T3 provides checklist + verifies)

User actions in the Polar dashboard (production/live mode):
1. Create the org; create two **products**: SaaS Starter $49/mo, Local Business $19/mo. Copy each **product ID**.
2. Create a **live access token** (`polar.sh/settings/tokens`).
3. Register a **production webhook** → URL `https://competitor-analyzer-production-62ee.up.railway.app/billing/webhook`; subscribe to `subscription.created/active/updated/canceled/revoked`; copy the **webhook secret**.
4. Set Railway env vars (backend service):
   - `POLAR_SERVER=production`
   - `POLAR_ACCESS_TOKEN=<live token>`
   - `POLAR_SAAS_PRODUCT_ID=<saas id>`
   - `POLAR_LOCAL_PRODUCT_ID=<local id>`
   - `POLAR_WEBHOOK_SECRET=<secret>`

No backend code change needed for go-live (already env-driven). T3 verifies after vars are set.

### WS2 — Enforcement (T1 backend)

1. Add `access_level(user)` (and a `is_read_only(user)` convenience) in a shared module (e.g. `app/access.py` or alongside `app/session.py`).
2. Add a FastAPI dependency `require_write_access` that resolves the user and raises **HTTP 402 Payment Required** (`{"detail": "Your trial has ended — upgrade to continue."}`) when `read_only`.
3. Apply `require_write_access` to the **guarded endpoints**:
   - `POST /api/v1/competitors`
   - `PATCH /api/v1/competitors/{id}`
   - `POST /api/v1/competitors/{id}/probe-careers`
   - `POST /api/v1/scan/now`
   - `POST /api/v1/scan/reviews`
   - `POST /api/v1/queue/{id}/approve`
   - battlecard **generation** when uncached/forced (cached serve stays open)
   - **Leave open:** all `/auth/*`, all GET reads, `PATCH /settings`, `DELETE /competitors/{id}`, all `/billing/*`.
4. Fix `app/scheduler.py:93`: scan only `access_level==full` users (exclude `trialing` whose `trial_ends_at < now`). Reuse the same helper.
5. Tests: helper truth table (active / trialing-valid / trialing-expired / canceled); a guarded endpoint returns 402 when read-only and 200 when full; scheduler excludes expired-trial users.

### WS3 — Billing UX (T2 frontend)

1. **Read-only banner** shown across the dashboard when read-only (derive from `subscription_status` + `trial_ends_at`, already returned by `/settings` and `/dashboard`): "Your trial ended — upgrade to resume scans & actions" + Upgrade button.
2. **Disable action buttons** in read-only (Add competitor, Scan now, Generate card, Approve) with a tooltip/Upgrade nudge; gracefully handle a 402 from the API (show the upgrade prompt, not a crash).
3. **Settings → Billing tab**: show plan + status; "Upgrade to Pro" → `getCheckoutUrl(plan)`; "Manage subscription" → `getPortalUrl()` when `active`. (F10 — the tab currently has no working buttons.)
4. `/billing/checkout` page already mints a real session once Polar is live — no change beyond confirming it.

### WS4 — Legal / compliance basics (T2 / content)

1. Add a **refund & cancellation policy** (Terms section or a short billing-terms block): cancel anytime via the customer portal, what happens to access on cancel (reverts to read-only), refund stance.
2. **Checkout + billing pages link to Terms & Privacy** before payment.
3. Verify `support@rivalscope.dev` is the contact on these pages (already standardized).

### WS5 — Verification (T3 + lanes)

1. **Sandbox first** (`POLAR_SERVER=sandbox` + existing sandbox token/products): full loop — checkout → complete test purchase → webhook flips status to `active` → read-only lifts → cancel via portal → status `canceled` → read-only returns. Verify scans pause/resume accordingly.
2. **Flip to production** creds (WS1) → production smoke test (real/live-mode purchase) → confirm webhook + status + access.
3. Only then announce launch.

## Sequencing

```
WS2 (backend enforcement) ─┐
WS3 (frontend billing UX) ─┼─ developed in parallel on separate worktree branches
WS4 (legal) ───────────────┘
        ↓ (merge via T3)
WS5 sandbox end-to-end verification  ← proves the whole loop with fake money
        ↓
WS1 flip Railway to production creds (user)
        ↓
WS5 production smoke test → launch
```

Enforcement (WS2) and UX (WS3) can land before production creds exist — they're verified in sandbox. Production credentials are the final flip, not a blocker for building.

## Lane assignment

| Workstream | Lane | Tree |
|---|---|---|
| WS1 Polar setup + Railway env | **User (ops)** | Polar dashboard + Railway |
| WS2 enforcement + scheduler | **T1 backend** | `/var/www/html/competitor-analyzer` |
| WS3 billing UX | **T2 frontend** | `/var/www/html/rivalscope-frontend` |
| WS4 legal basics | **T2 frontend** | `/var/www/html/rivalscope-frontend` |
| WS5 verification + merges | **T3 orchestrator** | own worktree |

## Open risks

- **Read/write classification:** battlecard generation is a GET but expensive — guard only the uncached/forced path so cached cards stay viewable in read-only. Confirm during implementation.
- **Webhook reliability:** if Polar can't reach the webhook, status won't flip to `active` and a paying user stays read-only. Verify webhook delivery in WS5; the portal/`customer_id` fallback in the webhook handler helps.
- **Trial length:** currently 2 days. Not changing it here, but flag if too short to convert.
- **Timezone gotcha:** `User.trial_ends_at` defaults to naive `datetime.utcnow()` (`models.py:17`); the `access_level` comparison must compare like-with-like (both naive-UTC or both aware) or it raises `TypeError`. This codebase has had UTC-naive bugs before — the helper must normalize.
- **Sandbox↔production token/server mismatch** was the original 401 cause — WS5 explicitly tests each server with its matching token.
