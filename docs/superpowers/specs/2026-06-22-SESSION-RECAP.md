# Session Recap — 2026-06-22 (Rivalscope)

Handoff for the next chat. Worked in the **3-terminal workflow**: T1 = backend (`/var/www/html/competitor-analyzer`), T2 = frontend (`/var/www/html/rivalscope-frontend` worktree), T3 = orchestrator (writes prompts, merges, verifies on prod). This is the standing way of working.

## Current production state
- **App live at https://rivalscope.dev** (branded domain, bought through Vercel, attached to the `competitor-analyzer` Vercel project — NOT the stale `frontend` project). SSL ok, OG/sitemap on the new domain.
- Backend on Railway `competitor-analyzer-production-62ee.up.railway.app`, `main` HEAD around `c1f4955`.
- Frontend + backend auto-deploy on merge to `main`.
- `main` is clean; no open PRs as of end of session.

## Shipped this session (all merged to main + verified live)
- **Issue #3 — battle-card data honesty (PR #7, #8):** `is_baseline` field → honest "No changes detected yet — baseline captured" instead of a fabricated change; all timestamps serialized as explicit UTC via `app/serialization.py:iso_utc()` (fixed the "5h ago right after a scan" skew for non-UTC users). 279 backend tests green.
- **Frontend polish (PR #6, 13 commits):** themed `not-found.tsx`; redirects `/login→/auth/login`, `/battlecard→/battlecards`; lime `#A8D600` sparkline → azure (chart-theme.ts ink palette); glassmorphism removed; banned motion (spring/transition-all) cleaned; a11y (44px touch targets); 8pt spacing; `is_baseline` render; DESIGN.md v4 sharpened (Responsive, Do's/Don'ts, Known Gaps).
- **Doc hygiene (PR #10):** globals.css comments v3→v4; DESIGN.md error/empty-state + chart-palette specs.
- **Mobile nav P0 (PR #12):** hamburger no longer pushed off-screen at 375px (CTA hidden below sm, lives in the menu).
- **Battlecard grid balance (PR #11):** `md:col-span-2`.
- **Polar env switch (PR #13):** `POLAR_SERVER` env (defaults `production`).
- **Canonical domain swap (PR #14):** all app URLs → rivalscope.dev (layout.tsx OG/meta, sitemap.ts, .env.production NEXT_PUBLIC_APP_URL, CLAUDE.md). Backend API URL left on Railway.

## Launch-blocker config done by T3 via CLI/API
- **Email (Resend):** verified `rivalscope.dev` (DKIM+MX+SPF via `vercel dns`), set `FROM_EMAIL=hello@rivalscope.dev` in Railway. Live test email delivered (200). Magic links + weekly briefs now reach real users.
- **Domain:** attached + `FRONTEND_URL=https://rivalscope.dev` (CORS + magic-link host follow; CORS also allows `*.vercel.app` via regex, main.py:117).
- **DeepSeek:** prod key funded $4.96, generating. **Top up before launch volume.**

## The ONE remaining gate: Polar billing
- Code targets **production** Polar (`api.polar.sh`). The Railway `POLAR_*` vars are currently **SANDBOX** values → checkout 500s in prod (the "Failed to fetch checkout url: API error 500" from settings/page.tsx:29 prefetch for non-customers; landing is clean, error is server-side + caught gracefully).
- **User is setting up production Polar with their mom's ID (payout/identity verification).** When verified, they create 2 products ($49 SaaS / $19 Local), a production org access token (scopes: checkouts:write, customer_sessions:write, products:read), and a webhook → `https://competitor-analyzer-production-62ee.up.railway.app/billing/webhook` (events: subscription.created/active/updated/canceled/revoked).
- Then T3 sets the 4 vars on Railway (`POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_SAAS_PRODUCT_ID`, `POLAR_LOCAL_PRODUCT_ID`) + `POLAR_SERVER=production`, validates the token against api.polar.sh, runs one real test checkout (refund after).

## Optional / deferred (not blockers)
- Polar success-redirect → rivalscope.dev (currently `{APP_BASE_URL}/billing/success`, a backend page) — do when wiring Polar.
- settings/page.tsx checkout-url prefetch logs a server-side 500 for non-customers until Polar is wired — self-resolves; optional to gate on billing-configured.
- error/empty-state component migration (specced in DESIGN.md, not yet applied).
- Throwaway prod test accounts to delete: `qa-audit-jun22@rivalscope.test`, `qa-smoke-jun22@rivalscope.test`.

## Pre-launch smoke (passed on rivalscope.dev)
Full funnel verified: landing → fresh signup → onboarding → add competitor (renders as domain) → scan → populated dashboard → honest battle card. No console errors except the known Polar checkout 500.

**Verdict: launch-ready except Polar billing.**
