# Next.js Frontend Rewrite — Design Spec
**Date:** 2026-06-03  
**Status:** Approved

## Overview

Rewrite the competitor-analyzer frontend from Jinja2/HTMX templates served by FastAPI into a Next.js 15 App Router app deployed on Vercel. FastAPI stays on Railway as a pure backend, gaining a clean `/api/v1/*` JSON API layer. GitHub push → Vercel auto-deploy. No more Railway Nixpacks frontend build failures.

---

## Architecture

```
GitHub (competitor-analyzer repo)
├── /                 → Railway (FastAPI backend, unchanged deploy)
└── /frontend         → Vercel (Next.js frontend, auto-deploy on push)
```

Vercel is configured to target the `frontend/` subfolder as the project root. Every push to `main` triggers independent deploys: Railway for backend changes, Vercel for frontend changes.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15, App Router |
| Language | TypeScript |
| Styling | Tailwind CSS (same zinc design system as current) |
| Auth session | `iron-session` (httpOnly cookie on Vercel domain) |
| Data fetching | Server Components with native `fetch` |
| Forms/mutations | Server Actions + `useActionState` |
| UI components | shadcn/ui (radix primitives, Tailwind-native) |

---

## Folder Structure

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── auth/login/page.tsx          # Login page (email form)
│   │   └── auth/verify/page.tsx         # Handles ?session_token= exchange
│   ├── (dashboard)/
│   │   ├── layout.tsx                   # Sidebar + server-side session check
│   │   ├── dashboard/page.tsx
│   │   ├── competitors/page.tsx
│   │   ├── queue/page.tsx
│   │   ├── trends/page.tsx
│   │   ├── settings/page.tsx
│   │   └── billing/success/page.tsx
│   └── api/
│       └── auth/
│           └── callback/route.ts        # Exchanges FastAPI JWT → iron-session cookie
├── components/
│   ├── sidebar.tsx
│   ├── toast-provider.tsx
│   └── ui/                              # shadcn/ui components
├── lib/
│   ├── session.ts                       # iron-session config
│   ├── api.ts                           # typed fetch wrapper for FastAPI calls
│   └── types.ts                         # shared TypeScript types
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## URL Routes

All URLs stay identical to the current app — no broken links:

| URL | Page |
|---|---|
| `/auth/login` | Login (email magic link form) |
| `/auth/verify` | Token exchange handler |
| `/dashboard` | Weekly brief / change events feed |
| `/competitors` | Competitor list + add/remove |
| `/queue` | Approval queue for AI-drafted actions |
| `/trends` | 12-week heatmap + activity chart |
| `/settings` | Account + subscription management |
| `/billing/success` | Post-checkout confirmation |

---

## Auth Flow

Cross-domain (Vercel ≠ Railway) means FastAPI's existing cookie cannot be read by Next.js. New flow:

```
1. User submits email at Next.js /auth/login
   → Server Action calls FastAPI POST /api/v1/auth/login
   → FastAPI sends magic link email (unchanged logic)

2. User clicks magic link → hits FastAPI /auth/verify?token=xxx (unchanged URL)
   → FastAPI verifies token in DB
   → FastAPI generates short-lived JWT (5-min expiry, signed with APP_SECRET_KEY)
   → FastAPI redirects to: {FRONTEND_URL}/auth/verify?session_token=<jwt>

3. Next.js /auth/verify page → hits Route Handler /api/auth/callback
   → Calls FastAPI POST /api/v1/auth/exchange { session_token: jwt }
   → FastAPI validates JWT, returns { user_id, email, subscription_status }
   → Route Handler sets iron-session httpOnly cookie on Vercel domain
   → Redirects to /dashboard

4. Protected pages:
   → (dashboard)/layout.tsx reads iron-session cookie (server-side)
   → If no session → redirect to /auth/login
   → Passes user_id as Authorization: Bearer <user_id> to all FastAPI API calls

5. Logout:
   → Server Action destroys iron-session cookie
   → Redirect to /auth/login
```

---

## FastAPI Changes

**Additive only** — all existing Jinja2 routes remain untouched. New file: `app/routes/api_v1.py`.

### New endpoints

```
POST /api/v1/auth/login          # Send magic link email, returns JSON
POST /api/v1/auth/exchange       # Validate session JWT, return user info
GET  /api/v1/dashboard           # Events + pending_count + last_scan + competitor_count
GET  /api/v1/competitors         # List active competitors
POST /api/v1/competitors         # Add competitor (url, name)
DELETE /api/v1/competitors/{id}  # Deactivate competitor
GET  /api/v1/queue               # Pending ApprovedActions with joined data
POST /api/v1/queue/{id}/approve  # Set approved_at, optionally save edited_text
GET  /api/v1/trends              # 12-week data: weeks array + per-competitor counts
GET  /api/v1/settings            # User info + subscription status + trial_ends_at
POST /api/v1/scan/now            # Trigger background scan for current user
```

### Auth for API endpoints

New FastAPI dependency `require_api_user` reads `Authorization: Bearer <user_id>` header. Used on all `/api/v1/*` routes except `/auth/*`.

---

## Design System

Keep the existing zinc dark sidebar design exactly as-is. Same fonts (Inter, Plus Jakarta Sans, JetBrains Mono), same color tokens, same spacing. No redesign — fastest path.

Sidebar component is a React Server Component. The pending queue badge count comes from the dashboard API call in layout.tsx.

---

## Environment Variables

**Vercel (frontend):**
- `NEXT_PUBLIC_API_URL` = Railway backend URL
- `IRON_SESSION_PASSWORD` = 32+ char secret (set in Vercel dashboard, not committed)

**Railway (backend) — new additions:**
- `FRONTEND_URL` = Vercel app URL (used to construct redirect after magic link verify)

`frontend/vercel.json`:
```json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "https://competitor-analyzer-production-62ee.up.railway.app"
  }
}
```

---

## What Does NOT Change

- FastAPI stays on Railway, same domain, same Postgres
- All existing Jinja2 routes remain functional during migration
- Magic link email format unchanged
- Stripe webhook endpoint unchanged (`/billing/webhook`)
- Scheduler, pipeline, scan logic — all unchanged
- Database schema — unchanged
