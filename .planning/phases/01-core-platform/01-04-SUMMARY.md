---
plan: 01-04
status: complete
commit: 60465b2
---

# Summary: Web App Foundation

## What Was Built

- **app/auth.py** — magic link tokens (one-use, 30min expiry, sha256 hashed), get_or_create_user, Mailgun email sender
- **app/session.py** — itsdangerous URLSafeTimedSerializer, set/get/require session cookie helpers
- **app/routes/auth.py** — POST /auth/login, GET /auth/verify, GET /auth/logout
- **app/routes/competitors.py** — MAX_COMPETITORS=7, add/remove (soft-delete), HTMX partial responses
- **app/routes/dashboard.py** — weekly brief display with empty state
- **main.py** — FastAPI app with lifespan, 7 routers, StaticFiles, /health endpoint
- **templates/** — base.html (Tailwind CDN + HTMX CDN), login.html, dashboard.html, competitors.html

## key-files.created

- app/auth.py
- app/session.py
- main.py
- templates/base.html

## Self-Check: PASSED
