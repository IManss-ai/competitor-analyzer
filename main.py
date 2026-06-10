from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, competitors, dashboard, queue, settings, billing, scan, trends, api_v1, battlecard, onboarding, local_business, discovery
from contextlib import asynccontextmanager
import asyncio
from app.scheduler import start_scheduler
from app.db import engine
from app.models import Base
from app.config import FRONTEND_URL

_STALE_REVISIONS = {None, "001", "001_initial", "002"}

def _run_migrations():
    try:
        from alembic.config import Config
        from alembic import command
        from alembic.runtime.migration import MigrationContext
        import os
        cfg = Config(os.path.join(os.path.dirname(__file__), "alembic.ini"))
        with engine.connect() as conn:
            ctx = MigrationContext.configure(conn)
            current = ctx.get_current_revision()
        if current in _STALE_REVISIONS:
            # Tables already exist from manual setup or column guards — stamp to head
            # so future migrations run from the correct baseline.
            print(f"[startup] Stale revision ({current!r}), stamping to head")
            command.stamp(cfg, "head")
        command.upgrade(cfg, "head")
        print("[startup] Alembic migrations applied")
        _apply_column_guards()
    except Exception as e:
        print(f"[startup] Alembic failed ({e}), applying manual column guards")
        _apply_column_guards()

def _apply_column_guards():
    """Idempotent checks to add columns if they don't already exist, compatible with SQLite & PostgreSQL."""
    from sqlalchemy import inspect
    columns_to_add = {
        "users": [
            ("password_hash", "VARCHAR", None),
            ("business_type", "VARCHAR", "'saas'"),
            ("scan_schedule", "VARCHAR", "'weekly'"),
            ("email_notifications", "BOOLEAN", "TRUE"),
            ("digest_email", "VARCHAR", None),
        ],
        "competitors": [
            ("business_type", "VARCHAR", "'saas'"),
            ("google_maps_url", "VARCHAR", None),
            ("instagram_handle", "VARCHAR", None),
            ("facebook_page", "VARCHAR", None),
            ("g2_url", "VARCHAR", None),
            ("trustpilot_url", "VARCHAR", None),
            ("capterra_url", "VARCHAR", None),
            ("careers_url", "VARCHAR", None),
        ]
    }
    try:
        inspector = inspect(engine)
        for table, cols in columns_to_add.items():
            if not inspector.has_table(table):
                continue
            existing_cols = {col["name"] for col in inspector.get_columns(table)}
            for col_name, col_type, default_val in cols:
                if col_name not in existing_cols:
                    default_clause = f" DEFAULT {default_val}" if default_val is not None else ""
                    stmt = f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}{default_clause}"
                    try:
                        with engine.begin() as conn:
                            conn.execute(__import__("sqlalchemy").text(stmt))
                        print(f"[startup] Column guard: Added column {table}.{col_name}")
                    except Exception as e:
                        print(f"[startup] Column guard statement failed (non-fatal): {stmt} - Error: {e}")
    except Exception as e:
        print(f"[startup] Column guard check failed: {e}")
    print("[startup] Column guards applied")

async def _init_db():
    try:
        await asyncio.wait_for(
            asyncio.to_thread(_run_migrations),
            timeout=60.0,
        )
    except asyncio.TimeoutError:
        print("[startup] Migration timed out")
    except Exception as e:
        print(f"[startup] Migration error (non-fatal): {e}")
    try:
        await asyncio.wait_for(
            asyncio.to_thread(Base.metadata.create_all, engine),
            timeout=30.0,
        )
        print("[startup] DB tables created/verified")
    except asyncio.TimeoutError:
        print("[startup] DB init timed out — tables may not exist yet")
    except Exception as e:
        print(f"[startup] DB init failed (non-fatal): {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(_init_db())
    start_scheduler()
    yield

app = FastAPI(title="Competitor Analyzer", lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3456",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files folder
app.mount("/static", StaticFiles(directory="static"), name="static")

# Register APIRouters
app.include_router(auth.router)
app.include_router(competitors.router)
app.include_router(dashboard.router)
app.include_router(queue.router)
app.include_router(settings.router)
app.include_router(billing.router)
app.include_router(scan.router)
app.include_router(trends.router)
app.include_router(api_v1.router)
app.include_router(battlecard.router)
app.include_router(onboarding.router)
app.include_router(local_business.router)
app.include_router(discovery.router)

@app.get("/")
def root():
    return RedirectResponse(url="/auth/login", status_code=302)

@app.get("/health")
def health():
    import os
    return {
        "status": "ok",
        "version": "v5-bg-init",
        "commit": (os.environ.get("RAILWAY_GIT_COMMIT_SHA") or "")[:7],
        "branch": os.environ.get("RAILWAY_GIT_BRANCH") or "local",
    }
