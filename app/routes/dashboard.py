from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select, func
from app.db import get_session
from app.models import ChangeEvent, Competitor, ApprovedAction, Snapshot, User
from app.session import require_current_user
import uuid

router = APIRouter()
templates = Jinja2Templates(directory="templates")

@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page(request: Request, db=Depends(get_session), user_id=Depends(require_current_user)):
    user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    
    # Fetch weekly briefs (change events)
    events = db.execute(
        select(ChangeEvent, Competitor)
        .join(Competitor, ChangeEvent.competitor_id == Competitor.id)
        .where(Competitor.user_id == user_uuid)
        .order_by(ChangeEvent.detected_at.desc())
        .limit(100)
    ).all()
    
    events_data = []
    for event, competitor in events:
        events_data.append({
            "event": event,
            "competitor": competitor
        })
    
    # Query count of pending ApprovedActions
    pending_count = db.execute(
        select(func.count(ApprovedAction.id))
        .where(ApprovedAction.user_id == user_uuid)
        .where(ApprovedAction.approved_at == None)
    ).scalar() or 0
    
    # Query last scan timestamp
    last_scan = db.execute(
        select(Snapshot.fetched_at)
        .join(Competitor)
        .where(Competitor.user_id == user_uuid)
        .order_by(Snapshot.fetched_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    
    competitor_count = db.execute(
        select(func.count(Competitor.id)).where(Competitor.user_id == user_uuid)
    ).scalar() or 0

    user = db.get(User, user_uuid)

    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "events": events_data,
        "pending_count": pending_count,
        "last_scan": last_scan,
        "competitor_count": competitor_count,
        "user": user,
    })
