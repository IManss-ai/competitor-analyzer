#!/usr/bin/env python3
"""
Verify Mailgun is configured correctly by sending a test email.

Usage:
    MAILGUN_API_KEY=key-xxx MAILGUN_DOMAIN=mg.yourdomain.com \
    python scripts/test_mailgun.py you@yourdomain.com
"""
import os
import sys

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import httpx

api_key = os.environ.get("MAILGUN_API_KEY", "")
domain  = os.environ.get("MAILGUN_DOMAIN", "")
to_addr = sys.argv[1] if len(sys.argv) > 1 else None

if not api_key or not domain:
    print("✗  MAILGUN_API_KEY and MAILGUN_DOMAIN must be set.")
    sys.exit(1)

if not to_addr:
    print("Usage: python scripts/test_mailgun.py recipient@example.com")
    sys.exit(1)

print(f"→  Domain:    {domain}")
print(f"→  Recipient: {to_addr}")
print()

resp = httpx.post(
    f"https://api.mailgun.net/v3/{domain}/messages",
    auth=("api", api_key),
    data={
        "from":    f"Competitor Analyzer <noreply@{domain}>",
        "to":      to_addr,
        "subject": "Mailgun test — Competitor Analyzer",
        "text":    "If you're reading this, Mailgun is configured correctly.\n\nYou'll receive weekly competitor briefs and magic login links at this address.",
    },
)

if resp.status_code == 200:
    print(f"✓  Email queued successfully (id: {resp.json().get('id', '?')})")
    print(f"   Check {to_addr} inbox — should arrive within 30 seconds.")
else:
    print(f"✗  Mailgun returned {resp.status_code}")
    print(f"   {resp.text}")
    sys.exit(1)
