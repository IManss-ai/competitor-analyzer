#!/usr/bin/env python3
"""
One-time script: create the Stripe Customer Portal configuration.
Run after STRIPE_SECRET_KEY and STRIPE_PRICE_ID are set in your environment.

Usage:
    STRIPE_SECRET_KEY=sk_... STRIPE_PRICE_ID=price_... python scripts/setup_stripe_portal.py

Or with a .env file:
    python scripts/setup_stripe_portal.py
"""
import os
import sys

# Allow running from repo root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import stripe

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
price_id       = os.environ.get("STRIPE_PRICE_ID", "")
app_base_url   = os.environ.get("APP_BASE_URL", "http://localhost:8000")

if not stripe.api_key:
    print("✗  STRIPE_SECRET_KEY is not set. Aborting.")
    sys.exit(1)

if not price_id:
    print("✗  STRIPE_PRICE_ID is not set. Aborting.")
    sys.exit(1)

mode = "LIVE" if stripe.api_key.startswith("sk_live") else "TEST"
print(f"→  Stripe mode: {mode}")
print(f"→  Price ID:    {price_id}")
print(f"→  Return URL:  {app_base_url}/settings")
print()

# Check if a portal configuration already exists
existing = stripe.billing_portal.Configuration.list(limit=5)
if existing.data:
    print(f"  Found {len(existing.data)} existing portal configuration(s).")
    for cfg in existing.data:
        print(f"  • {cfg.id}  (active={cfg.active})")
    print()
    answer = input("Create a new configuration anyway? [y/N] ").strip().lower()
    if answer != "y":
        print("Skipped. Existing configuration left unchanged.")
        sys.exit(0)

config = stripe.billing_portal.Configuration.create(
    business_profile={
        "headline": "Manage your Competitor Analyzer subscription",
        "privacy_policy_url": f"{app_base_url}/privacy" if app_base_url != "http://localhost:8000" else None,
        "terms_of_service_url": f"{app_base_url}/terms" if app_base_url != "http://localhost:8000" else None,
    },
    features={
        # Show all past invoices
        "invoice_history": {
            "enabled": True,
        },
        # Let customers update their card
        "payment_method_update": {
            "enabled": True,
        },
        # Let customers cancel — at period end, no proration
        "subscription_cancel": {
            "enabled": True,
            "mode": "at_period_end",
            "proration_behavior": "none",
            "cancellation_reason": {
                "enabled": True,
                "options": [
                    "too_expensive",
                    "missing_features",
                    "switched_service",
                    "unused",
                    "other",
                ],
            },
        },
        # Only one plan — no upgrade/downgrade UI needed
        "subscription_update": {
            "enabled": False,
        },
        # Let customers update name + email
        "customer_update": {
            "enabled": True,
            "allowed_updates": ["email", "name"],
        },
    },
    default_return_url=f"{app_base_url}/settings",
)

print(f"✓  Portal configuration created: {config.id}")
print()
print("Next: set this as the default in your Stripe dashboard:")
print(f"  https://dashboard.stripe.com/settings/billing/portal")
print()
print("The portal is now live. /billing/portal in your app will redirect")
print("subscribers directly to their self-serve billing page.")
