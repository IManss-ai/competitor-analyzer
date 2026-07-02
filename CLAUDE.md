# Rivalscope — Competitor Intelligence Platform Guide

Rivalscope is a premium competitive intelligence SaaS for founders and sales teams. It automatically tracks competitor homepage changes, aggregates customer complaints, detects hiring/strategic signals, and drafts actionable sales playbooks to win deals.

---

## 🎯 Project Overview & Core Flows

1. **Scan Pipeline (`app/pipeline/`)**:
   - **Fetcher**: Monitors competitor URLs via the Node Playwright/llm-scraper **sidecar** (`scraper-service/`, `POST /scrape`) — structured extraction serialized to stable markdown. Falls back to mock (local, `SCRAPER_URL` unset) then direct HTTP. Reviews use the sidecar's deterministic `POST /scrape-raw`. Runs in the same container; `SCRAPER_URL=http://localhost:3001`.
   - **Differ**: Performs character-level diff analysis (filtering out minor noise unless >100 characters net change).
   - **Classifier**: Uses DeepSeek (`llm.MODEL`) to categorize changes (`pricing_change`, `feature_add`, `repositioning`, `minor_copy`).
   - **Synthesizer**: Synthesizes changes into weekly email summaries for subscribers.
   - **Action Generator**: Drafts response playbooks (e.g., email templates, Slack alerts) for the approval queue.
2. **AI Battle Card Generator (`app/routes/battlecard.py`)**:
   - Aggregates the last 7 days of ChangeEvents, G2/Trustpilot complaints, and strategic signals.
   - **Cost guard:** generated cards are persisted in `battlecard_cache` (one row per competitor). `/generate` requires auth + ownership and serves the cached card unless it's >7 days old, new intel arrived, or `?force=true`. The public `/share` endpoint serves cache or a free heuristic — it must NEVER call a paid model (it's unauthenticated and crawled by bots).
   - Calls DeepSeek (`llm.MODEL`, thinking disabled via `llm.THINKING_OFF`) to generate a structured 4-quadrant response:
     - *Executive Summary*: Short strategic overview.
     - *Detected Changes*: Categorized list of competitor page edits.
     - *User Complaints*: Pain points compiled from G2 & Trustpilot reviews.
     - *Strategic Signals*: Strategic insights (e.g., job postings, biometric patents).
     - *Playbook*: 5 ranked, concrete sales plays with copy-to-clipboard.

---

## 🛠️ Technology Stack

- **Backend**: FastAPI + SQLAlchemy (SQLite for development, PostgreSQL in production) + Alembic migrations.
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS v4 + shadcn/ui (radix-nova, zinc neutrals) + Framer Motion (`motion/react`) + Recharts. Fonts: Geist Sans + Geist Mono (via `geist` package).
- **AI Models** — single provider: **DeepSeek** (OpenAI-compatible API). `app/llm.py` is the single source of truth; env vars `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL`. No OpenAI/Anthropic calls or keys anywhere.
  - `deepseek-v4-flash` (`llm.MODEL`) — every AI call site: classifier, weekly briefs, playbook drafts, battle cards, discovery/onboarding, review & job & social trackers, GEO visibility.
  - `deepseek-v4-pro` (`llm.MODEL_FLAGSHIP`) — reserved for a future battlecard-only upgrade; unused today.
  - Gotcha: `deepseek-v4-flash` defaults to THINKING mode — every call passes `extra_body=llm.THINKING_OFF` so reasoning tokens don't eat the output budget. Missing/dummy key → deterministic heuristic fallbacks (`llm.ai_available()`).

---

## 🎨 Design System & Brand Guidelines

**Always read `DESIGN.md` before any visual or UI work.** The design system is **shadcn neutral-modern** (zinc + single blue accent, dark-first). Supersedes v4 "Signal Desk".

- **Live now (shadcn neutral-modern, dark-first):** **Dark is the default** — a fresh visitor lands on dark via the `.dark` class on `<html>` (set by a pre-paint script in `layout.tsx`, shadcn convention). A saved `localStorage 'theme' = 'light'` persists to light. `useTheme()` (`lib/use-theme.ts`) drives the toggle. This **replaces** the old `data-theme="ink|paper"` attribute system. **Zinc neutrals** throughout (oklch). **Single blue primary** — light `oklch(0.57 0.20 272)`, dark `oklch(0.62 0.19 270)`; used only on primary CTAs, links, active/selected state, focus rings, signal/live dots — **never as a decorative background wash**. **Geist Sans** (UI/display, `--font-geist-sans`) + **Geist Mono** (code/numerals, `--font-geist-mono`), loaded via `geist` package. Base radius `--radius: 0.75rem` ("Premium Blue" pass); shadcn `<Card>` uses `rounded-xl` (≈ 1.05rem) by design. Near-flat surfaces — `--shadow-card` is a subtle layered shadow; `--shadow-elevated`/`--shadow-modal` for floating overlays. Charts read `useChartPalette()` (`lib/chart-theme.ts`). Tokens in `frontend/src/app/globals.css`; `sky-*` Tailwind scale remapped to `--primary` (theme-aware). shadcn primitives in `frontend/src/components/ui/`.
- **Legacy alias layer — RETIRED (P4 complete, 2026-07-02):** the old Signal Desk token names (`--surface-*`, `--text-*`, `--accent-*`, `--font-archivo`) no longer exist in `globals.css`; all files use shadcn token names directly (`--background`, `--foreground`, `--primary`, etc.). Do not reintroduce them. The `.rs-*` utility classes and the `sky-*` remap remain, now defined on shadcn tokens.
- **Rule:** read `DESIGN.md` before UI work. New components must use shadcn primitives (`components/ui/`) and CSS-var tokens — never hardcoded hex, never raw `text-white`/`bg-white` except on verified-contrast accent surfaces. No raw blue hex outside `--primary`. No spring/bounce motion (use `--duration-*` + `--ease-*`). Theme-aware: every component must render correctly in both dark and light. The 8pt spacing scale (`4 8 12 16 24 32 48 64`) is unchanged.

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
