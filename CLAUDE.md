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

Rivalscope uses a locked dark theme that mimics a Bloomberg terminal with taste:
- **Base Surfaces**: Page background `--surface-base` (`#070b14`), Card backgrounds `--surface-raised` (`#0e1628`).
- **Brand Accent**: Sky Blue (`#0ea5e9` for primary, `#38bdf8` for hover, `#0284c7` for shadow/glow/border).
- **Typography**: Geist Sans for page titles and main UI, Geist Mono for raw data, URL paths, stats, and badges.
- **Border Radiuses**: Buttons & inputs = `8px` (`rounded-lg`), Cards & modals = `12px` (`rounded-xl`).
- **Spacing**: Predictable 8pt rhythm scale (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`). No random spacing values.

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

## ☁️ Production Deployments

- **Frontend (Vercel)**:
  - **Live URL**: [https://competitor-analyzer-zeta.vercel.app](https://competitor-analyzer-zeta.vercel.app)
  - **Project Name**: `competitor-analyzer`
  - **Active Deployment**: `competitor-analyzer-qimiy216i-imanss-ais-projects.vercel.app`
- **Backend (Railway)**:
  - **Live URL**: [https://competitor-analyzer-production-62ee.up.railway.app](https://competitor-analyzer-production-62ee.up.railway.app)
  - **Health check path**: `/health` (checks migrations, DB connections, and table status)
