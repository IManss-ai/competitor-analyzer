# Competitor Analyzer Platform — Developer Guide

Competitive intelligence scanning tool for SaaS founders. Automatically monitors competitor homepages, classifies changes using GPT-4o-mini, synthesizes briefs, and drafts response templates using GPT-4o in the approval queue.

## Run Commands

Initialize virtual environment and run development server:
```bash
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

Run test suite:
```bash
./venv/bin/python -m unittest discover -s tests -p "test_*.py"
```

## Database Migrations

Runs Alembic schema migrations:
```bash
# Upgrade database to latest revision
alembic upgrade head

# Generate a new auto-migration (when app/models.py changes)
alembic revision --autogenerate -m "description_of_changes"
```

## Environment Configuration

Copy `.env.example` to `.env` and fill in values:
```bash
cp .env.example .env
```
Key variables:
- `DATABASE_URL`: local sqlite connection (`sqlite:///./test.db`) or production postgres
- `OPENAI_API_KEY`: API key for GPT-4o / GPT-4o-mini
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID`: Stripe variables
- `MAILGUN_API_KEY` / `MAILGUN_DOMAIN`: Mailgun configuration

## Architecture Notes

- **APScheduler**: Booted ambiently inside the lifespan context (`main.py`). The weekly brief cron job runs on `weekly_brief` trigger matching every Monday at 8:00 AM UTC.
- **On-Demand Scan**: Submits immediately using FastAPI `BackgroundTasks` via `/scan/now` (POST) to avoid locking response threads.
- **Brand Voice Capture**: The approval queue updates record the custom edited response text inside `ApprovedAction.edited_text` only if it differs from `ApprovedAction.original_draft`.
