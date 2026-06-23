# Rivalscope — Competitor Intelligence Platform Guide

Rivalscope is a premium competitive intelligence SaaS for founders and sales teams. It automatically tracks competitor homepage changes, aggregates customer complaints, detects hiring/strategic signals, and drafts actionable sales playbooks to win deals.

---

## 🎯 Project Overview & Core Flows

1. **Scan Pipeline (`app/pipeline/`)**:
   - **Fetcher**: Monitors competitor URLs via the Node Playwright/llm-scraper **sidecar** (`scraper-service/`, `POST /scrape`) — structured extraction serialized to stable markdown. Falls back to mock (local, `SCRAPER_URL` unset) then direct HTTP. Reviews use the sidecar's deterministic `POST /scrape-raw`. Runs in the same container; `SCRAPER_URL=http://localhost:3001`.
   - **Differ**: Performs character-level diff analysis (filtering out minor noise unless >100 characters net change).
   - **Classifier**: Uses `gpt-4o-mini` to categorize changes (`pricing_change`, `feature_add`, `repositioning`, `minor_copy`).
   - **Synthesizer**: Synthesizes changes into weekly email summaries for subscribers.
   - **Action Generator**: Drafts response playbooks (e.g., email templates, Slack alerts) for the approval queue.
2. **AI Battle Card Generator (`app/routes/battlecard.py`)**:
   - Aggregates the last 7 days of ChangeEvents, G2/Trustpilot complaints, and strategic signals.
   - **Cost guard:** generated cards are persisted in `battlecard_cache` (one row per competitor). `/generate` requires auth + ownership and serves the cached card unless it's >7 days old, new intel arrived, or `?force=true`. The public `/share` endpoint serves cache or a free heuristic — it must NEVER call a paid model (it's unauthenticated and crawled by bots).
   - Calls Claude (`claude-sonnet-4-6`) using **Prompt Caching** to generate a structured 4-quadrant response:
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
  - `gpt-4o-mini` (Response playbook draft generator — downgraded from `gpt-4o` for cost)
  - `claude-sonnet-4-6` (High-tier Battle Card analyst)

---

## 🎨 Design System & Brand Guidelines

**Always read `DESIGN.md` before any visual or UI work.** The design system is **v4 "Signal Desk"** (blue, **dark-first**), dual-theme:

- **Live now (v4 "Signal Desk", DUAL THEME, dark-first):** **Ink-dark is the default** — a fresh visitor lands on ink **regardless of OS `prefers-color-scheme`** (`html[data-theme="ink"]`); a saved choice persists. **Paper-light** is a first-class alternate via the **theme toggle** (topbar + landing nav + login). Ink `--surface-base` `#080b14` (deep navy near-black); paper `#f5f2ec`. **Electric-blue accent** — ink `--accent-primary` `#2e8bff` / CTA `#1e6bff`; paper slate-blue `#345781` — used sparingly (brand mark, primary action, active nav, signal, links, focus), **never** as a content-surface wash or on decorative cards. **Space Grotesk** (display + UI; fed through the legacy `--font-archivo` variable) + IBM Plex Mono; sharp `4px` radius; **flat** surfaces (depth via surface-ladder + hairline borders; `--shadow-card: none`, only `--shadow-elevated`/`--shadow-modal` for floating overlays). One signature navy→azure gradient glow per viewport, behind the hero headline only. A pre-paint inline script in `layout.tsx` avoids FOUC; `useTheme()` (`lib/use-theme.ts`) drives the toggle; charts read `useChartPalette()` (`lib/chart-theme.ts`). Tokens in `frontend/src/app/globals.css`; the Tailwind `sky-*` scale is remapped to the accent (theme-aware), so `sky-*` utilities render electric blue. Reference anchors: appkittie + Linear. (Supersedes v3 "Intelligence Desk" paper-default + slate-blue, and the reverted lime "Signal Room" experiment.)
- **Rule:** read `DESIGN.md` before UI work. New components must be **theme-aware** — use CSS-var tokens (`--text-*`, `--surface-*`, `--border-*`, `--fill-subtle*`, `--accent-*`), never hardcoded hex / grays / `text-white` / `bg-white/[…]` (those break a theme). `text-white` only on accent/badge/colored surfaces. No raw blue/violet hex outside the tokens; no `8`/`12px` radii (v2); no spring/bounce motion (use `--duration-*` + `--ease-*`). The 8pt spacing scale (`4 8 12 16 24 32 48 64`) is unchanged.

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
- **Production URL**: [https://rivalscope.dev](https://rivalscope.dev)
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
