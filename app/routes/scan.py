from fastapi import APIRouter, Request, Depends, BackgroundTasks
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from app.access import require_write_access_session
from app.db import SessionLocal
from app.pipeline.scanner import scan_user_competitors
import uuid

router = APIRouter(prefix="/scan")
templates = Jinja2Templates(directory="templates")

async def _run_scan_background(user_id: str):
    """Background task: scan + generate briefs + actions for one user."""
    print(f"[background-scan] Starting scan for user: {user_id}")
    db = SessionLocal()
    try:
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        results = await scan_user_competitors(user_uuid, db)
        print(f"[background-scan] Finished scan. Results: {results}")
    except Exception as e:
        import traceback
        print(f"[background-scan] Exception in background scan: {e}")
        traceback.print_exc()
    finally:
        db.close()

@router.post("/now", response_class=HTMLResponse)
async def trigger_scan(
    request: Request,
    background_tasks: BackgroundTasks,
    user_id=Depends(require_write_access_session)
):
    """
    Trigger an immediate scan for the current user.
    Runs in background — returns immediately with a "Scan started" message.
    """
    background_tasks.add_task(_run_scan_background, user_id)
    return HTMLResponse(
        '<span class="text-xs text-zinc-400 font-mono animate-fade-in">Scanning…</span>'
    )
