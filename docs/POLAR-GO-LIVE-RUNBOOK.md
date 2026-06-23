# Polar Billing — Go-Live Runbook

**Status (2026-06-23): HELD — blocked on a verified production Polar account.**

The trial-freeze enforcement code is complete and verified on branch
`integration/polar-launch` (pushed to origin, **not** merged to `main`).
It is intentionally held off `main` because **production checkout does not work
yet** — merging would auto-deploy (Vercel + Railway have no staging gate) and
freeze trial-expired users into read-only with no working way to pay.

While held, production keeps its current behavior: trial expiry is only
*displayed*, never enforced, so no user loses access.

---

## Root cause of the production 401 / 503

- `POLAR_SERVER` is **unset** on Railway → the app defaults to `"production"`
  (`app/config.py:24`).
- The configured `POLAR_ACCESS_TOKEN` is a **sandbox** token (`polar_oat_…`).
- A sandbox token sent to Polar's **production** API → **401**, which the
  checkout route degrades to a graceful **503** (PR #15 / F9).

Confirmed with `scripts/polar_probe.py`:

```
railway variables --json | python3 scripts/polar_probe.py
#   PRODUCTION /v1/organizations/ -> HTTP 401  (invalid / wrong env)
#   SANDBOX    /v1/organizations/ -> HTTP 403  (valid env, scoped)
```

---

## Go live in ~10 minutes once the production Polar org is verified

### 1. In Polar (production org — https://polar.sh)
- Create the SaaS subscription **product** → copy its **production product ID**.
- Create an **organization access token** → `polar_oat_…` (production).
- Copy the **webhook signing secret** (Settings → Webhooks; point the webhook at
  `https://competitor-analyzer-production-62ee.up.railway.app/billing/webhook`).

### 2. Set Railway production vars (Service `competitor-analyzer`, env `production`)
```bash
railway variables --set POLAR_SERVER=production
railway variables --set POLAR_ACCESS_TOKEN=<prod token>
railway variables --set POLAR_SAAS_PRODUCT_ID=<prod product id>
railway variables --set POLAR_WEBHOOK_SECRET=<prod webhook secret>
# APP_BASE_URL is already set to the production backend URL.
```

### 3. Verify the creds reach Polar production (no secrets printed)
```bash
railway variables --json | python3 scripts/polar_probe.py   # expect PRODUCTION -> 200 (or 403)
```

### 4. Smoke-test a REAL checkout on current `main` BEFORE merging enforcement
- Sign up at https://rivalscope.dev → click **Upgrade** → a real Polar checkout
  must complete.
- Confirm the webhook flips `subscription_status` → `active`.

### 5. Merge enforcement (this auto-deploys)
```bash
git checkout main
git merge --no-ff integration/polar-launch
git push origin main          # → Vercel + Railway deploy
# (or open a PR integration/polar-launch → main and merge)
```

### 6. Post-deploy smoke test
- Expired-trial account → paid write actions return **402** + the read-only
  banner appears.
- Upgrade from read-only → checkout → returns to full write access.
- Public `/share/{id}` and `/public/{id}` battle cards still load — **no paid
  call, no 402** (cost-guard invariant from `CLAUDE.md`).

---

## What ships in this release (`integration/polar-launch`)

**Backend** (`feat/polar-readonly-enforcement`)
- `app/access.py` — `access_level()` / `require_write_access` (402) single source of truth.
- 402 gates on paid/value-producing write endpoints; reads stay open everywhere.
- Scheduler skips trial-expired users (`access_level`, not just `status`).
- Battle card: read-only users may view a cached card but cannot trigger a new
  paid generation (even `?force=true`).

**Frontend** (`feat/polar-billing-ux`)
- Read-only banner, gated Scan / Generate / Add-competitor buttons.
- Upgrade / Manage-billing wiring; legal refund + cancellation terms.

**Verification:** 299 backend tests pass; frontend production build + TypeScript clean.
