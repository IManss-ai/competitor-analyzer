# Rivalscope — Competitor Intelligence Platform Guide

Rivalscope is a premium competitive intelligence SaaS for founders and sales teams. It automatically tracks competitor homepage changes, aggregates customer complaints, detects hiring/strategic signals, and drafts actionable sales playbooks to win deals.

---

## 🎯 Project Overview & Core Flows

1. **Scan Pipeline (`app/pipeline/`)**:
   - **Fetcher**: Monitors competitor URLs using the Jina AI Reader API to pull markdown content.
   - **Differ**: Performs character-level diff analysis (filtering out minor noise unless >100 characters net change).
   - **Classifier**: Uses `gpt-4o-mini` to categorize changes (`pricing_change`, `feature_add`, `repositioning`, `minor_copy`).
   - **Synthesizer**: Synthesizes changes into weekly email summaries for subscribers.
   - **Action Generator**: Drafts response playbooks (e.g., email templates, Slack alerts) for the approval queue.
2. **AI Battle Card Generator (`app/routes/battlecard.py`)**:
   - Aggregates the last 7 days of ChangeEvents, G2/Trustpilot complaints, and strategic signals.
   - Calls Claude (`claude-3-5-sonnet-20241022`) using **Prompt Caching** to generate a structured 4-quadrant response:
     - *Executive Summary*: Short strategic overview.
     - *Detected Changes*: Categorized list of competitor page edits.
     - *User Complaints*: Pain points compiled from G2 & Trustpilot reviews.
     - *Strategic Signals*: Strategic insights (e.g., job postings, biometric patents).
     - *Playbook*: 5 ranked, concrete sales plays with copy-to-clipboard.

---

## 🛠️ Technology Stack

- **Backend**: FastAPI + SQLAlchemy (SQLite for development, PostgreSQL in production) + Alembic migrations.
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS v4 + Framer Motion (`motion/react`) + Recharts.
- **AI Models**:
  - `gpt-4o-mini` (Classification & weekly briefs)
  - `gpt-4o` (Response playbook draft generator)
  - `claude-3-5-sonnet-20241022` (High-tier Battle Card analyst)

---

## 🎨 Design System & Brand Guidelines

**Always read `DESIGN.md` before any visual or UI work.** The design system now ships **dual-theme**:

- **Live now (v3 "Intelligence Desk", DUAL THEME):** both **paper-light** (default, `--surface-base` `#f5f2ec`) and **ink-dark** (`--surface-base` `#16140f`) ship, with a **theme toggle** (topbar + landing nav + login). New visitors **follow their OS `prefers-color-scheme`**; a saved choice overrides and persists. Theme = a `data-theme` attribute on `<html>` (`:root` = paper, `html[data-theme="ink"]` = ink, plus an OS-dark CSS fallback); a pre-paint inline script in `layout.tsx` avoids FOUC; `useTheme()` (`lib/use-theme.ts`) drives the toggle. Charts read `useChartPalette()` (`lib/chart-theme.ts`). **Slate-blue accent** (paper `#345781`, ink `#4f7cb0`), Archivo grotesk + IBM Plex Mono, sharp `4px` radius, flat cards, no glow. Tokens in `frontend/src/app/globals.css`; the Tailwind `sky` scale is remapped to the accent, so `sky-*` utilities render as it. (Accent was oxblood at first launch but read as a "red theme"; switched to slate-blue `6fe156a`. Keep the accent OFF decorative backgrounds.)
- **Remaining (v3 phase 3):** the bespoke broadsheet relayouts. See `DESIGN-REBUILD-PLAN.md`.
- **Rule:** read `DESIGN.md` before UI work. New components must be **theme-aware** — use CSS-var tokens (`--text-*`, `--surface-*`, `--border-*`, `--fill-subtle*`, `--accent-*`), never hardcoded grays / `text-white` / `bg-white/[…]` / dark hex (those break paper). `text-white` only on accent/badge/colored surfaces. Don't introduce raw sky/violet hex or `8`/`12px` radii (v2). The 8pt spacing scale (`4 8 12 16 24 32 48 64`) is unchanged.

---

## 🚀 Run Commands

### Backend Setup & Server
```bash
# Initialize and activate virtual environment
source venv/bin/activate

# Start uvicorn development server
uvicorn main:app --reload --port 8000
```

### Run Tests
```bash
# Run unit tests
./venv/bin/python -m unittest discover -s tests -p "test_*.py"
```

### Database Migrations (Alembic)
```bash
# Upgrade DB to latest revision
alembic upgrade head

# Generate a new auto-migration (when app/models.py changes)
alembic revision --autogenerate -m "description_of_changes"
```

---

## ☁️ Production Deployments & Workflows

### 1. GitHub Remote & Push Workflow
- **Repository URL**: [github.com/IManss-ai/competitor-analyzer](https://github.com/IManss-ai/competitor-analyzer.git)
- **Deployment Branch**: `main`
- **Workflow**:
  ```bash
  git add .
  git commit -m "your description"
  git push origin main
  ```

### 2. Frontend Deployment (Vercel)
- **Production URL**: [https://competitor-analyzer-zeta.vercel.app](https://competitor-analyzer-zeta.vercel.app)
- **Secondary Deployment Domain**: [https://competitor-analyzer-m8amtwbus-imanss-ais-projects.vercel.app](https://competitor-analyzer-m8amtwbus-imanss-ais-projects.vercel.app)
- **Vercel Project**: `competitor-analyzer` (Owner: `imanss-ais-projects`)
- **CI/CD Triggers**: Pushes to `origin/main` automatically build and deploy the frontend production build.
- **Quick Deploy Command**:
  ```bash
  npm run deploy
  ```

### 3. Backend Deployment (Railway)
- **Production URL**: [https://competitor-analyzer-production-62ee.up.railway.app](https://competitor-analyzer-production-62ee.up.railway.app)
- **Health Check Endpoint**: `/health` (verifies SQLite/Postgres connections, applied tables, and alembic migrations)
- **Service Name**: `competitor-analyzer`
- **CLI Deployment Command** (runs from the workspace root):
  ```bash
  railway up
  ```
- **Check Status / Logs**:
  ```bash
  railway status
  railway deployment list
  railway logs
  ```
