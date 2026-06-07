<div align="center">

# Rivalscope

**Competitor intelligence for growing teams.**

Rivalscope automatically tracks competitor homepage changes, aggregates customer complaints from review sites, detects hiring and strategic signals, and drafts ready-to-send sales playbooks — so you know every competitor move before your customers do.

[Live app](https://competitor-analyzer-zeta.vercel.app) · [API health](https://competitor-analyzer-production-62ee.up.railway.app/health)

</div>

---

## What it does

Rivalscope turns scattered competitive research into a weekly, actionable brief:

1. **Monitors** competitor URLs on a schedule and pulls clean page content via the Jina AI Reader.
2. **Diffs** each scan against the last snapshot (character-level, with noise filtering).
3. **Classifies** every meaningful change — `pricing_change`, `feature_add`, `repositioning`, or `minor_copy`.
4. **Aggregates** customer complaints from G2 / Trustpilot / Capterra and detects strategic signals (hiring posts, etc.).
5. **Synthesizes** it all into a weekly email brief and a 4-quadrant **Battle Card** with a ranked, copy-to-clipboard sales playbook.

---

## Key capabilities

- **Automated page scans** — crawls competitor homepages, extracts content, diffs against history.
- **Intelligent change classification** — pricing vs. feature vs. repositioning vs. minor copy.
- **Review intelligence** — surfaces recurring complaints from public review sites.
- **Hiring & strategic signals** — detects careers-page activity and other strategic tells.
- **AI Battle Cards** — a structured Executive Summary, Detected Changes, User Complaints, Strategic Signals, and a 5-step Playbook.
- **Action queue** — drafts response assets (emails, taglines, Slack alerts) pre-filled with the competitor's name.
- **Trends & heatmap** — change activity over a rolling 12-week window.
- **Subscription billing** — Polar.sh subscriptions with per-plan competitor limits (SaaS Starter $49/mo, Local Business $19/mo).

---

## Architecture

A single repository with a FastAPI backend at the root and a Next.js app in `frontend/`.

```
                       ┌────────────────────────┐
                       │      Client Browser     │
                       └───────────┬────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              ▼  Next.js (Vercel)            JSON / Bearer ▼
   ┌────────────────────────┐            ┌────────────────────────┐
   │  Next.js 16 App Router │  ───────▶  │   FastAPI (Railway)    │
   │  iron-session auth     │            │   APScheduler jobs     │
   └────────────────────────┘            └───────────┬────────────┘
                                                      │
                        ┌─────────────────────────────┼─────────────────────────────┐
                        ▼                              ▼                              ▼
              ┌──────────────────┐         ┌──────────────────┐          ┌──────────────────────┐
              │  Postgres/SQLite │         │  Jina · OpenAI · │          │  Polar.sh (billing)  │
              │  + Alembic       │         │  Anthropic       │          │                      │
              └──────────────────┘         └──────────────────┘          └──────────────────────┘
```

### Pipeline (`app/pipeline/`)

| Stage | Role |
|-------|------|
| **Fetcher** | Pulls competitor page content via the Jina AI Reader API. |
| **Differ** | Character-level diff, filtering noise below a net-change threshold. |
| **Classifier** | `gpt-4o-mini` categorizes the change type. |
| **Synthesizer** | Builds weekly email briefs for subscribers. |
| **Action generator** | Drafts response playbooks (`gpt-4o`) for the approval queue. |

The **Battle Card** generator (`app/routes/battlecard.py`) aggregates the last 7 days of changes, complaints, and signals and calls Claude (`claude-3-5-sonnet-20241022`, with prompt caching) to produce the structured 4-quadrant response.

---

## Tech stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy, Alembic, APScheduler, Uvicorn. SQLite for dev, PostgreSQL in production.
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion (`motion/react`), Recharts.
- **AI models:** `gpt-4o-mini` (classification & briefs), `gpt-4o` (playbook drafts), `claude-3-5-sonnet-20241022` (Battle Cards).
- **Services:** Jina AI Reader (page fetch), Polar.sh (billing), Resend (transactional email).

---

## Project structure

```
competitor-analyzer/
├── app/                  # FastAPI backend
│   ├── pipeline/         # fetcher · differ · classifier · synthesizer · action generator
│   ├── routes/           # API v1, battlecard, billing, auth
│   ├── models.py         # SQLAlchemy models
│   └── config.py
├── frontend/             # Next.js 16 app (deployed to Vercel)
│   └── src/
│       ├── app/          # routes: landing, (auth), (dashboard), share, legal
│       ├── components/   # battle-card, sidebar, trends, etc.
│       └── lib/          # api client, session, types
├── alembic/              # DB migrations
├── tests/                # backend test suite
├── DESIGN.md             # design system (dark "Bloomberg terminal" theme)
└── CLAUDE.md             # contributor / agent guide
```

---

## Local development

### Prerequisites
- Python 3.12+
- Node.js 18+

### 1. Backend (root directory)

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then fill in the keys below
alembic upgrade head
uvicorn main:app --reload --port 8000
```

**Environment variables**

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | DB connection (`sqlite:///./test.db` for dev). |
| `OPENAI_API_KEY` | Change classification + copy drafting. |
| `JINA_API_KEY` | Jina AI Reader page crawling. |
| `ANTHROPIC_API_KEY` | Battle Card generation. |
| `POLAR_ACCESS_TOKEN` / `POLAR_WEBHOOK_SECRET` | Subscription billing. |
| `POLAR_SAAS_PRODUCT_ID` / `POLAR_LOCAL_PRODUCT_ID` | Polar product IDs for the $49 / $19 plans. |
| `RESEND_API_KEY` | Magic-link / transactional email. |
| `APP_SECRET_KEY` | Session token signing. |

### 2. Frontend (`frontend/`)

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
echo "IRON_SESSION_PASSWORD=complex_password_at_least_32_characters_long_for_dev" >> .env.local
npm run dev          # http://localhost:3000
```

---

## Testing

```bash
# Backend unit + integration tests
./venv/bin/python -m unittest discover -s tests -p "test_*.py"

# Frontend type check + lint
cd frontend && npx tsc --noEmit && npm run lint
```

---

## Deployment

| Layer | Platform | Trigger | URL |
|-------|----------|---------|-----|
| Frontend | **Vercel** | auto-deploys on push to `origin/main` | https://competitor-analyzer-zeta.vercel.app |
| Backend | **Railway** | `railway up` | https://competitor-analyzer-production-62ee.up.railway.app |

The backend exposes `/health`, which verifies DB connectivity, applied tables, and Alembic migration state.

```bash
# Frontend (from frontend/)
npm run deploy        # vercel --prod --yes

# Backend (from repo root)
railway up
```

---

## Design system

Rivalscope uses a locked dark theme that reads like "a Bloomberg terminal with taste": deep-slate surfaces (`#070b14`), a single sky-blue accent (`#0ea5e9`), Geist Sans for UI and Geist Mono for data, an 8pt spacing scale, and a one-system radius scale. The full contract lives in [`DESIGN.md`](./DESIGN.md).

---

## License

Proprietary. © 2026 Rivalscope. All rights reserved.
