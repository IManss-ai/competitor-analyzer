#!/usr/bin/env python3
"""
Verify Resend is configured correctly by sending a test email.

Usage:
    RESEND_API_KEY=re_... python scripts/test_resend.py you@example.com
"""
import os, sys

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import httpx

api_key   = os.environ.get("RESEND_API_KEY", "")
from_email = os.environ.get("FROM_EMAIL", "onboarding@resend.dev")
to_addr   = sys.argv[1] if len(sys.argv) > 1 else None

if not api_key:
    print("✗  RESEND_API_KEY is not set.")
    sys.exit(1)
if not to_addr:
    print("Usage: python scripts/test_resend.py recipient@example.com")
    sys.exit(1)

print(f"→  From: {from_email}")
print(f"→  To:   {to_addr}")

resp = httpx.post(
    "https://api.resend.com/emails",
    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
    json={
        "from": f"Competitor Analyzer <{from_email}>",
        "to": [to_addr],
        "subject": "Resend test — Competitor Analyzer",
        "text": "If you're reading this, Resend is configured correctly.\n\nYou'll receive weekly competitor briefs and magic login links at this address.",
    },
)

if resp.status_code in (200, 201):
    print(f"✓  Email queued (id: {resp.json().get('id', '?')})")
    print(f"   Check {to_addr} — should arrive within 30 seconds.")
else:
    print(f"✗  Resend returned {resp.status_code}: {resp.text}")
    sys.exit(1)
