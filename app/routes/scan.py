from fastapi import APIRouter, Request, Depends, BackgroundTasks
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from app.db import get_session, SessionLocal
from app.pipeline.scanner import scan_user_competitors
from app.session import require_current_user
import uuid

router = APIRouter(prefix="/scan")
templates = Jinja2Templates(directory="templates")

async def _run_scan_background(user_id: str):
    """Background task: scan + generate briefs + actions for one user."""
    db = SessionLocal()
    try:
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        await scan_user_competitors(user_uuid, db)
    finally:
        db.close()

@router.post("/now", response_class=HTMLResponse)
async def trigger_scan(
    request: Request,
    background_tasks: BackgroundTasks,
    db=Depends(get_session),
    user_id=Depends(require_current_user)
):
    """
    Trigger an immediate scan for the current user.
    Runs in background — returns immediately with a "Scan started" message.
    """
    background_tasks.add_task(_run_scan_background, user_id)
    return HTMLResponse(
        '<span class="text-xs text-zinc-400 font-mono animate-fade-in">Scanning…</span>'
    )
