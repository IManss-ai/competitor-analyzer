# Polar Billing — Status: PRODUCTION LIVE (2026-06-25)

> ⚠️ **DO NOT set `POLAR_SERVER=sandbox` on the live Railway service.**
> Production billing is configured and working. Flipping to sandbox would break
> real checkout for real users. (This file replaces the old
> `POLAR-SANDBOX-DEMO.md`, whose sandbox instructions are now obsolete.)

## Current state (verified)
- **Polar production org: approved.** Production billing is wired on Railway
  (`competitor-analyzer`, env `production`):
  - `POLAR_SERVER=production`
  - `POLAR_ACCESS_TOKEN` — production token (`polar_oat_…`)
  - `POLAR_WEBHOOK_SECRET` — production webhook secret (`polar_whs_…`)
  - `POLAR_SAAS_PRODUCT_ID=a0827598-9a42-4c6e-b02f-a8205a071a85` — SaaS Starter $49/mo
  - `POLAR_LOCAL_PRODUCT_ID=6afc7623-50eb-4782-8cb1-3fbe3bf9092c` — Local Business $19/mo
  - (Secrets live in Railway only — never in the repo.)
- **Verified 2026-06-25:**
  - Token authenticates against Polar **production** (`scripts/polar_probe.py`:
    PROD `/v1/organizations/` → **200**; SANDBOX → 401).
  - The live backend `GET /api/v1/billing/checkout-url` returns **real production**
    checkout links for both plans:
    `https://polar.sh/checkout/polar_c_…` (NOT `sandbox.polar.sh`).

## Demoing revenue to mentors
The funnel is live — a real purchase on rivalscope.dev is **real revenue**.
- Sign up → **Upgrade** → real Polar checkout → pay with a **real card** (this
  charges the real plan price and is real money).
- There is no test-card shortcut in production. Sandbox test cards (4242…) do **not**
  work against production.
- If you want to show the flow without a charge, demo up to the Polar checkout page
  and stop before paying.

## Still pending (per go-live runbook)
1. **Real-card smoke test:** complete one real purchase and confirm the webhook flips
   `subscription_status → active` and unlocks paid actions. The webhook handler is
   unit-tested (`tests/test_billing_webhook.py`: `test_subscription_created_marks_user_active`)
   and the endpoint points at `…railway.app/billing/webhook`.
2. **Ship enforcement:** merge `integration/polar-launch` → main (auto-deploys) to
   turn on the read-only/upgrade gating for trial-expired users. Do this **after**
   the real-card test so nobody is frozen out before payments are confirmed.

## Account-holder note
Payouts are set up under an adult relative's identity (the founder is a minor; Polar/
Stripe require 18+). Keep the Polar identity + Stripe identity + bank account
consistent to that same person, or payouts freeze. See the project memory for details.

## Isolated testing (only if ever needed)
If you genuinely need to test billing changes in isolation, do it against a
**separate, non-production** backend instance with sandbox creds — **never** by
changing `POLAR_SERVER` on the live Railway service.
