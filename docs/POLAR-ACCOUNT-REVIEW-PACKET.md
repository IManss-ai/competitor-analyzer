# Polar Account Review — Paste-Ready Packet

**Goal:** complete the Polar "Account Review" checklist and hit **Submit for review**
so Polar's approval clock starts. Real money on rivalscope.dev cannot go live until
Polar approves this org. (Verified 2026-06-25.)

Checklist state from the dashboard screenshot:
- ✅ Product description — done
- ⏳ Product configuration — paste below
- ⏳ Checkout integration — see note
- ✅ Identity verification — done (the old "mom's ID" blocker is cleared)
- ⏳ Payout account — **YOU only** (needs a real bank account) ⚠️
- ⏳ Social links — paste below
- ⏳ Product website — paste below
- 🔸 Support email — paste below

---

## Product configuration — create TWO products

### Product 1 — SaaS Starter
- **Name:** `Rivalscope — SaaS Starter`
- **Price:** `$49` / month (recurring, monthly)
- **Description:** Competitor intelligence for SaaS founders and startups.
- **Benefits / features:**
  - Website monitoring
  - Pricing page tracking
  - Battle Card with AI action plans
  - Review intelligence (G2, Trustpilot)
  - Weekly email report
- After creating it, **copy the production product ID** → this becomes the prod
  `POLAR_SAAS_PRODUCT_ID`.

### Product 2 — Local Business
- **Name:** `Rivalscope — Local Business`
- **Price:** `$19` / month (recurring, monthly)
- **Description:** Competitor intelligence for salons, cafes, gyms, and local shops.
- **Benefits / features:**
  - Google Reviews monitoring
  - Instagram & Facebook tracking
  - Nearby competitor alerts
  - Local Battle Card
  - Weekly summary email
- Copy the **production product ID** → prod `POLAR_LOCAL_PRODUCT_ID`.

> Both plans offer a 2-day free trial (enforced in-app, not in Polar).

---

## Checkout integration
Our app creates checkouts via the Polar SDK (`polar.checkouts.create`), so the
integration already exists in code. In the dashboard this step is usually satisfied
by **having at least one product + an organization access token**. If Polar wants a
concrete checkout link to mark it complete, create a checkout/payment link for the
**SaaS Starter** product and save it. No code change needed.

---

## Payout account ⚠️ ONLY YOU CAN DO THIS
Polar pays out via Stripe Connect — it needs a **real bank account** (IBAN / account
+ routing) and may ask for the account holder's details. This is the one item that
can't be pre-filled and is the most likely thing to stall approval. Have your bank
details ready before you start.

---

## Social links
- **X / Twitter:** `https://x.com/Manss_dev`
- **LinkedIn:** your founder or company profile URL (the launch *post* was
  `https://www.linkedin.com/feed/update/urn:li:share:7475120077336436737/` — but
  this field wants a **profile/company** URL, not a single post).

---

## Product website
```
https://rivalscope.dev
```

---

## Support email
```
hello@rivalscope.dev
```
(This is a business-domain email — satisfies the "business email is preferred" flag.
It's already the app's verified Resend sender.)

---

## After you Submit for review — what I do (engineering, ~10 min once approved)

The enforcement code is already built + verified on branch `integration/polar-launch`
(299 tests green). The moment Polar approves and you have the prod product IDs +
prod token + prod webhook secret, go-live is:

```bash
# 1. point Railway at production Polar (4 vars)
railway variables --set POLAR_SERVER=production
railway variables --set POLAR_ACCESS_TOKEN=<prod polar_oat_…>
railway variables --set POLAR_SAAS_PRODUCT_ID=<prod saas product id>
railway variables --set POLAR_LOCAL_PRODUCT_ID=<prod local product id>
railway variables --set POLAR_WEBHOOK_SECRET=<prod polar_whs_…>

# 2. point the prod webhook in Polar at:
#    https://competitor-analyzer-production-62ee.up.railway.app/billing/webhook

# 3. verify creds reach Polar production, then real-checkout smoke test on main

# 4. merge enforcement (auto-deploys)
git checkout main && git merge --no-ff integration/polar-launch && git push origin main
```

Full detail: `git show integration/polar-launch:docs/POLAR-GO-LIVE-RUNBOOK.md`.
Friday fallback if approval doesn't land in time: `docs/POLAR-SANDBOX-DEMO.md`.
</content>
</invoke>
