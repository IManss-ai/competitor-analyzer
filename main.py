from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from app.routes import auth, competitors, dashboard, queue, settings, billing, scan
from contextlib import asynccontextmanager
from app.scheduler import start_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start APScheduler cron on startup
    start_scheduler()
    yield

app = FastAPI(title="Competitor Analyzer", lifespan=lifespan)

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

@app.get("/")
def root():
    return RedirectResponse(url="/auth/login", status_code=302)

@app.get("/health")
def health():
    return {"status": "ok", "version": "v2-design"}
