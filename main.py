from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, competitors, dashboard, queue, settings, billing, scan, trends, api_v1
from contextlib import asynccontextmanager
import asyncio
from app.scheduler import start_scheduler
from app.db import engine
from app.models import Base
from app.config import FRONTEND_URL

async def _init_db():
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
    allow_origins=[FRONTEND_URL],
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

@app.get("/")
def root():
    return RedirectResponse(url="/auth/login", status_code=302)

@app.get("/health")
def health():
    return {"status": "ok", "version": "v5-bg-init"}
