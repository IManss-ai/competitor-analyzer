# Competitor Analyzer

Competitor Analyzer is a weekly competitive intelligence platform designed for SaaS founders and teams to track competitor pricing pages, feature releases, and positioning changes across their market landscape. 

The platform automatically scans target homepages, tracks changes, classifies updates (pricing, features, repositioning), synthesizes competitive intelligence briefs, and drafts counter-positioning assets in the action queue.

---

## Key Capabilities

* **Automated Webpage Scans** – Crawls competitor homepages, extracts main content blocks, and performs difference checks against past snapshots.
* **Intelligent Change Classification** – Identifies whether page updates constitute a pricing adjustment, feature announcement, messaging pivot, or minor copy tweak.
* **Playbook Action Queue** – Drafts responder assets (such as retention emails, pricing taglines, roadmap bulletins, and social responses) customized automatically with the competitor's name.
* **Competitor Battle Cards** – Generates structured, 5-item strategic battle plan action lists based on recent competitor shifts.
* **Trends & Heatmap Analytics** – Visualizes competitor change activity and event densities over a rolling 12-week window.
* **Stripe Billing Integration** – Dynamic subscription limit enforcement restricting the number of tracked competitors based on customer account state.

---

## System Architecture

The project is structured as a decoupled single-repository, containing a FastAPI Python backend in the root folder and a Next.js frontend in the `/frontend` subfolder.

```
                  ┌──────────────────────┐
                  │   Client Browser     │
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼ (Next.js Frontend)              ▼ (JSON API Calls)
┌──────────────────────┐           ┌──────────────────────┐
│  Next.js App Server  │           │   FastAPI Backend    │
│  localhost:3000      │           │   localhost:8000     │
└──────────────────────┘           └──────────┬───────────┘
                                              │
                                   ┌──────────┴───────────┐
                                   ▼                      ▼
                       ┌──────────────────────┐┌──────────────────────┐
                       │  SQLite Database     ││   External APIs      │
                       │  (test.db)           ││   (OpenAI, Jina, etc)│
                       └──────────────────────┘└──────────────────────┘
```

### Technology Stack
* **Backend:** Python 3.12, FastAPI, SQLAlchemy, SQLite (with PostgreSQL compatibility), APScheduler, Uvicorn
* **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Motion, Recharts
* **APIs & Services:** Jina AI (webpage reading), OpenAI GPT-4o/GPT-4o-mini (classification & synthesis), Anthropic Claude (battle card generation), Stripe (payments)

---

## Local Development Setup

Follow these steps to run both services locally for development and testing.

### Prerequisites
* Python 3.12+
* Node.js 18+

### 1. Backend Configuration & Start
The backend resides in the root directory of the project.

1. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Copy `.env.example` to `.env` and fill in configuration settings:
   ```bash
   cp .env.example .env
   ```
   Main environment variables:
   * `DATABASE_URL` – Local SQLite file connection string (`sqlite:///./test.db`).
   * `OPENAI_API_KEY` – OpenAI API key for page change classification and copy drafting.
   * `JINA_API_KEY` – Jina AI Reader API key for webpage crawling.
   * `ANTHROPIC_API_KEY` – Anthropic API key for generating competitive battle cards.
   * `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` – Stripe dashboard keys.
   * `RESEND_API_KEY` – Email token delivery service api key.
   * `APP_SECRET_KEY` – Secret key for signing session tokens.
4. Run schema migrations to initialize the database:
   ```bash
   alembic upgrade head
   ```
5. Start the FastAPI application:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### 2. Frontend Configuration & Start
The frontend resides in the `/frontend` directory.

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file mapping the backend endpoint URL:
   ```ini
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
4. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   The frontend UI will be active at `http://localhost:3000`.

---

## Testing & Verification

Run the test suite using `pytest`:
```bash
PYTHONPATH=. ./venv/bin/pytest tests/
```

To run a full end-to-end simulation (adding a competitor, crawling mock updates, parsing changes, and generating battlecards on the live running local database), run the verify utility script:
```bash
PYTHONPATH=. ./venv/bin/python scripts/verify_e2e.py
```
