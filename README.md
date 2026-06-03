# Competitor Analyzer

Competitor Analyzer is a weekly competitive intelligence platform designed for product, engineering, and marketing teams to track pricing pages, feature releases, and positioning changes across their market landscape. 

Instead of manual tracking, the platform scans target URLs every week, diffs key layouts, and generates a structured Battle Card detailing exactly what changed and recommending counter-positioning moves.

---

## Key Capabilities

* **Weekly Change Audits** – Scans up to 7 competitor websites automatically, diffing layout structure and identifying pricing changes, new feature additions, copy rewrites, and strategic hires.
* **Playbook Action Queue** – Consolidates detected competitor updates into editable AI-drafted response items (such as counter-sales battle cards or feature flags).
* **Trends & Density Analytics** – Visualizes historical activity over a rolling 12-week period with area-activity curves and density heatmaps.
* **Stripe Billing Integration** – Built-in subscription plans for founders and local businesses, limiting tracking profiles dynamically based on active tiers.

---

## System Architecture

The platform is built as an decoupled single-repo system, with the backend serving as a JSON API and the frontend running as a React single-page application.

```
                  ┌──────────────────────┐
                  │   Client Browser     │
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼ (Next.js App)                   ▼ (JSON API Calls)
┌──────────────────────┐           ┌──────────────────────┐
│  Vercel Frontend     │           │   Railway Backend    │
│  Next.js 16 Client   │           │   FastAPI (Python)   │
└──────────────────────┘           └──────────┬───────────┘
                                              │
                                   ┌──────────┴───────────┐
                                   ▼                      ▼
                       ┌──────────────────────┐┌──────────────────────┐
                       │  PostgreSQL database ││   Stripe Gateway     │
                       └──────────────────────┘└──────────────────────┘
```

### Technology Stack
* **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Motion, Recharts
* **Backend:** Python 3.12, FastAPI, SQLAlchemy (Async), Alembic, Clerk JWT Authentication, PostgreSQL
* **Hosting:** Vercel (Frontend), Railway (Backend + DB)

---

## Local Development Setup

To run both services locally, follow these steps:

### Prerequisites
* Python 3.12+ installed
* Node.js 18+ installed
* Running PostgreSQL instance (or SQLite for local dev)

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file from the configuration structure:
   ```ini
   DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/db
   NEXT_PUBLIC_API_URL=http://localhost:8000
   CLERK_JWKS_URL=https://your-clerk-domain/.well-known/jwks.json
   STRIPE_SECRET_KEY=sk_test_...
   ANTHROPIC_API_KEY=sk-ant-...
   ```
5. Apply migrations and start the server:
   ```bash
   alembic upgrade head
   uvicorn main:app --reload
   ```

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file:
   ```ini
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```
4. Start the Next.js development server:
   ```bash
   npm run dev
   ```

---

## Deployments

The repository is configured for automated deployments triggered on pushes to the `main` branch.

* **Frontend Deployments:** Managed automatically via Vercel integration, loading configuration settings from `frontend/vercel.json` and proxying API endpoints.
* **Backend Deployments:** Hosted on Railway, rebuilding the FastAPI app on git trigger and running DB schema upgrades.
