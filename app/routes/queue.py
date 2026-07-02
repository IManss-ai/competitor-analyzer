from fastapi import APIRouter, Request, Form, Depends
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from app.db import get_session
from app.models import ApprovedAction, ChangeEvent, Competitor, User
from app.session import require_current_user
from app.access import require_write_access_session
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/queue")
templates = Jinja2Templates(directory="templates")

@router.get("/", response_class=HTMLResponse)
async def approval_queue(request: Request, db=Depends(get_session), user_id=Depends(require_current_user)):
    user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    
    # Get pending actions (approved_at is null)
    pending = db.execute(
        select(ApprovedAction, ChangeEvent, Competitor)
        .join(ChangeEvent, ApprovedAction.change_event_id == ChangeEvent.id)
        .join(Competitor, ChangeEvent.competitor_id == Competitor.id)
        .where(ApprovedAction.user_id == user_uuid)
        .where(ApprovedAction.approved_at == None)
        .order_by(ApprovedAction.created_at.desc())
    ).all()
    
    # Unpack into list of dicts or tuples for template readability
    actions_data = []
    for action, change, competitor in pending:
        actions_data.append({
            "action": action,
            "change_event": change,
            "competitor": competitor
        })
        
    user = db.get(User, user_uuid)

    return templates.TemplateResponse("queue.html", {
        "request": request,
        "pending_actions": actions_data,
        "user": user,
    })

@router.post("/{action_id}/approve", response_class=HTMLResponse)
async def approve_action(
    request: Request,
    action_id: str,
    edited_text: str = Form(None),
    db=Depends(get_session),
    user_id=Depends(require_write_access_session)
):
    user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    action_uuid = uuid.UUID(action_id) if isinstance(action_id, str) else action_id
    
    action = db.get(ApprovedAction, action_uuid)
    if not action or action.user_id != user_uuid:
        return HTMLResponse("Not found", status_code=404)
        
    action.approved_at = datetime.now(timezone.utc)
    
    # Brand voice capture: only store edited_text if it differs from original_draft
    if edited_text:
        cleaned_edited = edited_text.strip()
        cleaned_original = action.original_draft.strip()
        if cleaned_edited != cleaned_original:
            action.edited_text = cleaned_edited
            
    db.commit()
    
    # Return empty response to let HTMX remove card from DOM
    return HTMLResponse("")

@router.post("/{action_id}/dismiss", response_class=HTMLResponse)
async def dismiss_action(
    request: Request,
    action_id: str,
    db=Depends(get_session),
    user_id=Depends(require_write_access_session)
):
    user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    action_uuid = uuid.UUID(action_id) if isinstance(action_id, str) else action_id
    
    action = db.get(ApprovedAction, action_uuid)
    if action and action.user_id == user_uuid:
        action.approved_at = datetime.now(timezone.utc)
        db.commit()
        
    return HTMLResponse("")
