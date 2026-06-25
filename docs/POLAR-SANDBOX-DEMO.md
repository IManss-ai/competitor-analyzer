# Polar Paid-Funnel Demo (Sandbox) — Mentor Walk-through

**Goal:** show a *working paid funnel* end-to-end without touching the live
production billing on rivalscope.dev. Everything below runs against **Polar
sandbox** (real checkout UI, test-card payments, real webhook → account unlocks).

**Status:** verified working 2026-06-25.
- Sandbox checkout creation confirmed (real `https://sandbox.polar.sh/checkout/…`).
- Webhook → `subscription_status = active` flip covered by 43 passing billing tests
  (`tests/test_billing_webhook.py`: `test_subscription_created_marks_user_active`,
  `test_user_lookup_by_customer_id_when_metadata_missing`).
- The sandbox credentials (token, webhook secret, product IDs) are already set on
  Railway; production stays untouched (`POLAR_SERVER` unset → production → graceful).

---

## Polar sandbox test card (use this to "pay")

```
Card number : 4242 4242 4242 4242
Expiry      : any future date (e.g. 12/34)
CVC         : any 3 digits (e.g. 123)
ZIP / name  : anything
```

No real money moves — sandbox is Stripe test mode under the hood.

---

## Option A (recommended for mentors) — full app flow, locally in sandbox

This shows the *whole* funnel: sign up → hit a paywalled action → upgrade →
pay → account unlocks.

1. **Point the backend at sandbox** (one line — the sandbox creds are already in
   the environment; this just routes the SDK to sandbox-api.polar.sh):
   ```bash
   export POLAR_SERVER=sandbox
   # plus the sandbox POLAR_ACCESS_TOKEN / POLAR_WEBHOOK_SECRET / POLAR_SAAS_PRODUCT_ID
   # (pull them once from Railway: `railway variables` → copy the POLAR_* values)
   ```
2. **Expose the webhook** so Polar can reach your local server (needed for the
   account to flip to active after payment):
   ```bash
   # in a separate terminal — any tunnel works
   cloudflared tunnel --url http://localhost:8000
   # copy the https URL it prints
   ```
   In the **Polar sandbox dashboard → Settings → Webhooks**, point the webhook at
   `<tunnel-url>/billing/webhook` and set `APP_BASE_URL=<tunnel-url>`.
3. **Start the app** (`uvicorn main:app --reload --port 8000` + the frontend),
   sign up with a fresh email, click **Upgrade** → the real Polar sandbox checkout
   opens → pay with the test card above.
4. Polar fires the webhook → the account flips to **active** and the paywalled
   actions unlock. That's the funnel.

---

## Option B (fastest, zero setup) — just show the checkout

If you only need to show that real paid checkout works (the payment half):

1. Generate a fresh sandbox checkout link (from the repo root, venv active):
   ```bash
   railway variables --json | ./venv/bin/python - <<'PY'
   import json, sys
   v = json.load(sys.stdin)
   from polar_sdk import Polar, models
   with Polar(access_token=v["POLAR_ACCESS_TOKEN"], server="sandbox") as p:
       c = p.checkouts.create(request=models.CheckoutCreate(
           products=[v["POLAR_SAAS_PRODUCT_ID"]],
           customer_email="mentor-demo@rivalscope.dev",
       ))
   print(c.url)
   PY
   ```
2. Open the printed `https://sandbox.polar.sh/checkout/…` link, pay with the test
   card, and you'll land on the success page. This proves the live payment flow.

> For the "account unlocks" part on top of Option B, explain it's driven by the
> Polar webhook (verified by the billing test suite) — or use Option A to show it
> live.

---

## Going live with REAL money (after the demo / once prod Polar is verified)

When the production Polar org is approved, follow
`docs/POLAR-GO-LIVE-RUNBOOK.md` (on branch `integration/polar-launch`): set the 4
production `POLAR_*` vars on Railway incl. `POLAR_SERVER=production`, probe → 200,
real-checkout smoke test, then merge `integration/polar-launch`.
