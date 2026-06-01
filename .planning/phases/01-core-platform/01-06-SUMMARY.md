---
plan: 01-06
status: complete
commit: 517d89d
---

# Summary: Stripe Billing + Mailgun Delivery + Cron + On-Demand Scan

## What Was Built

- **app/billing.py** — Stripe checkout (14-day trial, card required), customer portal session
- **app/routes/billing.py** — checkout redirect, success page, webhook handler (4 events), signature verification
- **app/mailer.py** — Mailgun weekly brief, sent even with no changes, non-blocking (returns False on failure)
- **app/scheduler.py** — APScheduler Monday 8am UTC cron, trialing/active users only
- **app/routes/scan.py** — on-demand scan via BackgroundTasks (non-blocking)
- **main.py (updated)** — FastAPI lifespan starts scheduler on boot

## key-files.created

- app/billing.py
- app/scheduler.py
- app/mailer.py
- app/routes/billing.py
- app/routes/scan.py

## Self-Check: PASSED
